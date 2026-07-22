import { NextResponse } from "next/server";

import { jsonError, unauthorized } from "@/lib/api/schemas";
import { requireCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch {
    return unauthorized();
  }

  const { id } = await params;
  const key = await db.apiKey.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!key || key.userId !== user.id) {
    return jsonError("API key not found", 404);
  }

  await db.apiKey.update({
    where: { id },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedBy: user.id,
    },
  });

  return NextResponse.json({ success: true });
}
