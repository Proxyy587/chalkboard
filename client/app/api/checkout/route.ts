import { NextResponse } from "next/server";

/** Public SDK checkout disabled — use authenticated /api/billing/checkout only. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Use POST /api/billing/checkout while signed in. Public checkout is disabled.",
    },
    { status: 410 }
  );
}
