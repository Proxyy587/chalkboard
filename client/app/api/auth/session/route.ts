import { NextResponse } from "next/server";

import { getCurrentUser, signInWithEmail, signOut } from "@/lib/auth/session";
import { jsonError, loginSchema } from "@/lib/api/schemas";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user });
}

export async function POST(req: Request) {
  try {
    const body = loginSchema.parse(await req.json());
    const user = await signInWithEmail(body.email, body.name);
    return NextResponse.json({ user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Login failed";
    return jsonError(msg, 400);
  }
}

export async function DELETE() {
  await signOut();
  return NextResponse.json({ ok: true });
}
