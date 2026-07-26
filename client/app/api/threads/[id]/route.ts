import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { threadInclude, toClientThread } from "@/lib/threads/serialize";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.string().min(1).optional(),
  duration: z.number().int().positive().nullable().optional(),
  prompt: z.string().min(1).optional(),
  video: z
    .object({
      id: z.string().min(1),
      title: z.string().optional(),
      status: z.enum(["queued", "processing", "completed", "failed"]).optional(),
      jobId: z.string().nullable().optional(),
      videoUrl: z.string().nullable().optional(),
      error: z.string().nullable().optional(),
      cached: z.boolean().optional(),
    })
    .optional(),
});

async function ownedThread(userId: string, id: string) {
  return db.thread.findFirst({
    where: { id, userId },
    include: threadInclude,
  });
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const row = await ownedThread(user.id, id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ thread: toClientThread(row) });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await ownedThread(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  await db.$transaction(async (tx) => {
    if (data.title != null || data.model != null || data.duration !== undefined) {
      await tx.thread.update({
        where: { id },
        data: {
          ...(data.title != null ? { title: data.title } : {}),
          ...(data.model != null ? { model: data.model } : {}),
          ...(data.duration !== undefined ? { duration: data.duration } : {}),
        },
      });
    }

    if (data.prompt != null) {
      const userMsg = existing.messages.find((m) => m.role === "user");
      if (userMsg) {
        await tx.threadMessage.update({
          where: { id: userMsg.id },
          data: { content: data.prompt },
        });
      } else {
        await tx.threadMessage.create({
          data: {
            threadId: id,
            role: "user",
            content: data.prompt,
          },
        });
      }
    }

    if (data.video) {
      const v = data.video;
      await tx.threadVideo.upsert({
        where: { id: v.id },
        create: {
          id: v.id,
          threadId: id,
          title: v.title ?? "Render",
          status: v.status ?? "queued",
          jobId: v.jobId ?? null,
          videoUrl: v.videoUrl ?? null,
          error: v.error ?? null,
          cached: v.cached ?? false,
        },
        update: {
          ...(v.title != null ? { title: v.title } : {}),
          ...(v.status != null ? { status: v.status } : {}),
          ...(v.jobId !== undefined ? { jobId: v.jobId } : {}),
          ...(v.videoUrl !== undefined ? { videoUrl: v.videoUrl } : {}),
          ...(v.error !== undefined ? { error: v.error } : {}),
          ...(v.cached != null ? { cached: v.cached } : {}),
        },
      });
    }
  });

  const row = await ownedThread(user.id, id);
  return NextResponse.json({ thread: row ? toClientThread(row) : null });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await db.thread.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.thread.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
