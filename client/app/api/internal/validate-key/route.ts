import { NextResponse } from "next/server";

import { validateApiKey } from "@/lib/api-keys/validate";
import { jsonError } from "@/lib/api/schemas";

/**
 * Internal endpoint for the Python video worker to validate user API keys.
 * Protected by INTERNAL_SERVICE_SECRET — never expose publicly without it.
 */
export async function POST(req: Request) {
  const secret = process.env.INTERNAL_SERVICE_SECRET?.trim();
  if (!secret) {
    return jsonError("Internal validation not configured", 503);
  }

  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (auth !== secret) {
    return jsonError("Forbidden", 403);
  }

  let body: { key?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const result = await validateApiKey(body.key ?? "", {
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 401 });
  }

  return NextResponse.json({ valid: true, ...result.data });
}
