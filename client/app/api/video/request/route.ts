import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  clientIp,
  isOwnerEmail,
  refundAccountRender,
  refundGuestQuota,
  tryConsumeAccountRender,
  tryConsumeGuestQuota,
} from "@/lib/quota";
import type { VideoRequestBody } from "@/lib/video-api";
import {
  getChalkboardApiBase,
  isModelAllowedForPlan,
} from "@/lib/chalkboard-api";

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

  // Session / guest browser path — gate LLM by plan (API keys enforced on worker).
  if (!isUserKey && !isMasterKey && !incoming && body.model?.trim()) {
    let plan = "FREE";
    if (user && !ownerByEmail) {
      const row = await db.user.findUnique({
        where: { id: user.id },
        select: { plan: true },
      });
      plan = row?.plan ?? "FREE";
    } else if (ownerByEmail) {
      plan = "PRO";
    }
    if (!isModelAllowedForPlan(body.model.trim(), plan)) {
      return NextResponse.json(
        {
          error:
            "That model requires a higher plan. Upgrade on /pricing for Sonnet/Opus-class models.",
        },
        { status: 403 }
      );
    }
  }

  let apiKey = "";
  let consumed: "guest" | "account" | null = null;
  let accountMode: "daily" | "monthly" | "unlimited" = "daily";

  if (isUserKey) {
    apiKey = incoming;
  } else if (isMasterKey) {
    apiKey = master;
  } else if (incoming && !isUserKey && !isMasterKey) {
    apiKey = incoming;
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
      const q = await tryConsumeGuestQuota(ip);
      if (!q.ok) {
        return NextResponse.json(
          { error: q.error, remaining: 0, limit: q.limit },
          { status: 429 }
        );
      }
      consumed = "guest";
    } else {
      const q = await tryConsumeAccountRender(user.id, {
        ownerEmail: ownerByEmail,
      });
      if (!q.ok) {
        return NextResponse.json(
          { error: q.error, remaining: 0, limit: q.limit },
          { status: 429 }
        );
      }
      accountMode = q.mode;
      consumed = q.mode === "unlimited" ? null : "account";
    }
  }

  const base = getChalkboardApiBase();
  // Session/guest demos use the master key — pin free-tier quality unless paid/owner.
  let proxyBody: VideoRequestBody = { ...body };
  if (!isUserKey && !isMasterKey && !incoming) {
    let plan = "FREE";
    if (user && !ownerByEmail) {
      const row = await db.user.findUnique({
        where: { id: user.id },
        select: { plan: true },
      });
      plan = (row?.plan ?? "FREE").toUpperCase();
    } else if (ownerByEmail) {
      plan = "PRO";
    }
    const paid = plan === "HOBBY" || plan === "PRO" || plan === "OWNER";
    proxyBody = {
      ...body,
      watermark: !paid,
      max_height: paid ? 1080 : 720,
    };
  }

  let res: Response;
  try {
    res = await fetch(`${base}/video/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(proxyBody),
    });
  } catch {
    if (consumed === "guest") await refundGuestQuota(ip).catch(() => {});
    if (consumed === "account" && user) {
      await refundAccountRender(user.id, accountMode).catch(() => {});
    }
    return NextResponse.json(
      { error: "Video service unreachable. Try again in a moment." },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (consumed === "guest") await refundGuestQuota(ip).catch(() => {});
    if (consumed === "account" && user) {
      await refundAccountRender(user.id, accountMode).catch(() => {});
    }
  }

  return NextResponse.json(data, { status: res.status });
}
