import { NextResponse } from "next/server";

import { getChalkboardApiBase } from "@/lib/chalkboard-api";
import type { VideoRequestBody } from "@/lib/video-api";

/**
 * Proxy to the Python video worker.
 *
 * Auth:
 * - Prefer caller `x-api-key` (chalk_* user key or master key)
 * - If missing, fall back to server `CLARITY_API_KEY` for the open home demo
 *   (platform .env R2 on the worker). Never expose that key to the browser.
 */
export async function POST(req: Request) {
  const incoming = req.headers.get("x-api-key")?.trim();
  const master = process.env.CLARITY_API_KEY?.trim();
  const apiKey = incoming || master;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing API key. Create one in Settings → API keys, or set CLARITY_API_KEY on the Next.js server for the open demo.",
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
