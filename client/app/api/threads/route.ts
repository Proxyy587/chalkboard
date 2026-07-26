import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { DEFAULT_LECTURE_MODEL } from "@/lib/chalkboard-api";
import { threadInclude, toClientThread } from "@/lib/threads/serialize";

const createSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  model: z.string().min(1).default(DEFAULT_LECTURE_MODEL),
  duration: z.number().int().positive().nullable().optional(),
  prompt: z.string().min(1),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db.thread.findMany({
      where: { userId: user.id },
      include: threadInclude,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      threads: rows.map(toClientThread),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load threads";
    console.error("[api/threads]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, title, model, duration, prompt } = parsed.data;
  const now = new Date();

  const row = await db.thread.create({
    data: {
      ...(id ? { id } : {}),
      userId: user.id,
      title,
      model,
      duration: duration ?? null,
      messages: {
        create: [
          {
            role: "user",
            content: prompt,
            createdAt: now,
          },
        ],
      },
    },
    include: threadInclude,
  });

  return NextResponse.json({ thread: toClientThread(row) }, { status: 201 });
}
