import { NextResponse } from "next/server";

import { getChalkboardApiBase } from "@/lib/chalkboard-api";
import { getSession } from "@/lib/auth/session";
import {
  checkGuestQuota,
  checkUserDailyQuota,
  clientIp,
  consumeGuestQuota,
  consumeUserDailyQuota,
  isOwnerEmail,
  isUnlimitedPlan,
} from "@/lib/quota";
import type { VideoRequestBody } from "@/lib/video-api";
import { db } from "@/lib/db";

/**
 * Proxy to the Python video worker with quota enforcement.
 *
 * - Guest (no session): 1 video / IP lifetime (cache clear does not reset)
 * - Signed-in free: 3 videos / UTC day (website demo via master key)
 * - Owner email / unlimited plan / CLARITY_API_KEY: unlimited
 * - chalk_* keys: worker enforces daily quota by plan
 *
 * Never exposes CLARITY_API_KEY to the browser.
 */
export async function POST(req: Request) {
  const session = await getSession();
  const user = session?.user ?? null;
  const ip = clientIp(req);

  const incoming = req.headers.get("x-api-key")?.trim() ?? "";
  const master = process.env.CLARITY_API_KEY?.trim() ?? "";
  const isUserKey = incoming.startsWith("chalk_") && incoming.includes("_sk_v1_");
  const isMasterKey = Boolean(master && incoming === master);

  let body: VideoRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const ownerByEmail = isOwnerEmail(user?.email);

  // chalk_* → worker enforces FREE daily. Owner emails always unlimited on demo path.
  let apiKey = "";
  let consume: "guest" | "user" | null = null;

  if (isUserKey) {
    apiKey = incoming;
    consume = null;
  } else if (isMasterKey) {
    apiKey = master;
    consume = null;
  } else if (incoming && !isUserKey && !isMasterKey) {
    // Unknown key — still forward; worker returns 401. Don't burn quota.
    apiKey = incoming;
    consume = null;
  } else {
    // No browser key → server injects master for open demo / signed-in UI
    if (!master) {
      return NextResponse.json(
        {
          error:
            "Missing API key. Create one in Settings → API keys, or set CLARITY_API_KEY on the server.",
        },
        { status: 401 }
      );
    }
    apiKey = master;

    if (!user) {
      const q = await checkGuestQuota(ip);
      if (!q.ok) {
        return NextResponse.json(
          { error: q.error, remaining: 0, limit: q.limit },
          { status: 429 }
        );
      }
      consume = "guest";
    } else if (ownerByEmail) {
      consume = null;
    } else {
      // Prefer plan from any active API key for this user
      const keyRow = await db.apiKey.findFirst({
        where: { userId: user.id, isActive: true, revokedAt: null },
        select: { plan: true },
        orderBy: { createdAt: "desc" },
      });
      if (isUnlimitedPlan(keyRow?.plan)) {
        consume = null;
      } else {
        const q = await checkUserDailyQuota(user.id, { unlimited: false });
        if (!q.ok) {
          return NextResponse.json(
            { error: q.error, remaining: 0, limit: q.limit },
            { status: 429 }
          );
        }
        consume = "user";
      }
    }
  }

  const base = getChalkboardApiBase();
  let res: Response;
  try {
    res = await fetch(`${base}/video/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { error: "Video service unreachable. Try again in a moment." },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => ({}));

  // Only consume after the worker accepted the job (2xx)
  if (res.ok) {
    try {
      if (consume === "guest") await consumeGuestQuota(ip);
      if (consume === "user" && user) await consumeUserDailyQuota(user.id);
    } catch {
      // Don't fail the job if quota write races; worker already accepted
    }
  }

  // Never leak internal detail shapes to clients beyond worker payload
  return NextResponse.json(data, { status: res.status });
}
