import { NextResponse } from "next/server";

import { getChalkboardApiBase } from "@/lib/chalkboard-api";

type Params = { params: Promise<{ jobId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { jobId } = await params;
  const apiKey = req.headers.get("x-api-key")?.trim();
  const base = getChalkboardApiBase();
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch(`${base}/video/status/${jobId}`, {
    cache: "no-store",
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
