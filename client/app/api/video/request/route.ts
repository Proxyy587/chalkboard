import { NextResponse } from "next/server";

import { getChalkboardApiBase } from "@/lib/chalkboard-api";
import { getSession } from "@/lib/auth/session";
import {
  checkAccountRenderQuota,
  checkGuestQuota,
  clientIp,
  consumeAccountRender,
  consumeGuestQuota,
  isOwnerEmail,
} from "@/lib/quota";
import type { VideoRequestBody } from "@/lib/video-api";

/**
 * Proxy to the Python video worker with quota enforcement.
 *
 * - Guest: 1 video / IP lifetime
 * - Free account: 3 / UTC day
 * - Hobby/Pro: monthly renderCredits (Dodo)
 * - Owner email / master key: unlimited
 * - chalk_* keys: worker enforces by key plan
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

  let apiKey = "";
  let consume: "guest" | "account" | null = null;
  let accountMode: "daily" | "monthly" | "unlimited" = "daily";

  if (isUserKey) {
    apiKey = incoming;
    consume = null;
  } else if (isMasterKey) {
    apiKey = master;
    consume = null;
  } else if (incoming && !isUserKey && !isMasterKey) {
    apiKey = incoming;
    consume = null;
  } else {
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
    } else {
      const q = await checkAccountRenderQuota(user.id, {
        ownerEmail: ownerByEmail,
      });
      if (!q.ok) {
        return NextResponse.json(
          { error: q.error, remaining: 0, limit: q.limit },
          { status: 429 }
        );
      }
      accountMode = q.mode;
      consume = q.mode === "unlimited" ? null : "account";
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

  if (res.ok) {
    try {
      if (consume === "guest") await consumeGuestQuota(ip);
      if (consume === "account" && user) {
        await consumeAccountRender(user.id, accountMode);
      }
    } catch {
      /* don't fail accepted jobs on quota write races */
    }
  }

  return NextResponse.json(data, { status: res.status });
}
