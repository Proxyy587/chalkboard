import { NextResponse } from "next/server";

import { getChalkboardApiBase } from "@/lib/chalkboard-api";

type Params = { params: Promise<{ jobId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { jobId } = await params;
  const base = getChalkboardApiBase();
  const res = await fetch(`${base}/video/status/${jobId}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
