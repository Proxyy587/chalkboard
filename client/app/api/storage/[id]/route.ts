import { NextResponse } from "next/server";

import { jsonError, unauthorized } from "@/lib/api/schemas";
import { requireCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createStorageAdapterFromIntegration } from "@/lib/storage/factory";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch {
    return unauthorized();
  }

  const { id } = await params;
  const row = await db.storageIntegration.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!row || row.userId !== user.id) {
    return jsonError("Storage integration not found", 404);
  }

  await db.storageIntegration.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function POST(_req: Request, { params }: Params) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch {
    return unauthorized();
  }

  const { id } = await params;
  const integration = await db.storageIntegration.findUnique({ where: { id } });
  if (!integration || integration.userId !== user.id) {
    return jsonError("Storage integration not found", 404);
  }

  const adapter = createStorageAdapterFromIntegration(integration);
  const result = await adapter.testConnection();

  if (result.success) {
    await db.storageIntegration.update({
      where: { id },
      data: { isVerified: true, verifiedAt: new Date() },
    });
  }

  return NextResponse.json(result);
}
