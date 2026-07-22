import { NextResponse } from "next/server";

import { getChalkboardApiBase } from "@/lib/chalkboard-api";
import type { VideoRequestBody } from "@/lib/video-api";

/**
 * Proxy to the Python video worker.
 * Pass your API key via header: x-api-key: chalk_live_sk_v1_...
 */
export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key")?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing x-api-key header. Create a key in Settings → API Keys.",
      },
      { status: 401 }
    );
  }

  let body: VideoRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const base = getChalkboardApiBase();
  const res = await fetch(`${base}/video/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
