import { NextResponse } from "next/server";

import { getChalkboardApiBase } from "@/lib/chalkboard-api";

type Params = { params: Promise<{ jobId: string }> };

/**
 * Proxy job status. Injects server master key when the browser has none
 * (guest / signed-in demo). Never exposes the master key to the client.
 */
export async function GET(req: Request, { params }: Params) {
  const { jobId } = await params;
  if (!jobId || jobId.length > 128 || !/^[\w-]+$/.test(jobId)) {
    return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
  }

  const incoming = req.headers.get("x-api-key")?.trim();
  const master = process.env.CLARITY_API_KEY?.trim();
  const apiKey = incoming || master;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  const base = getChalkboardApiBase();
  let res: Response;
  try {
    res = await fetch(`${base}/video/status/${encodeURIComponent(jobId)}`, {
      cache: "no-store",
      headers: { "x-api-key": apiKey },
    });
  } catch {
    return NextResponse.json(
      { error: "Video service unreachable" },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
