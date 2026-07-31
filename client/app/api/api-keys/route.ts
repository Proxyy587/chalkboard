import { NextResponse } from "next/server";

import { createKeySchema, jsonError, unauthorized } from "@/lib/api/schemas";
import { generateApiKey } from "@/lib/api-keys/generate";
import { requireCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const MAX_KEYS = 10;

export async function GET() {
  let user;
  try {
    user = await requireCurrentUser();
  } catch {
    return unauthorized();
  }

  const keys = await db.apiKey.findMany({
    where: { userId: user.id, isActive: true },
    select: {
      id: true,
      name: true,
      prefix: true,
      type: true,
      environment: true,
      plan: true,
      credits: true,
      creditLimit: true,
      usageCount: true,
      lastUsedAt: true,
      scopes: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    keys: keys.map((k) => ({
      ...k,
      credits: Number(k.credits),
      creditLimit: k.creditLimit ? Number(k.creditLimit) : null,
    })),
  });
}

export async function POST(req: Request) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch {
    return unauthorized();
  }

  const count = await db.apiKey.count({ where: { userId: user.id, isActive: true } });
  if (count >= MAX_KEYS) {
    return jsonError(`Maximum ${MAX_KEYS} active API keys allowed`, 400);
  }

  let input;
  try {
    input = createKeySchema.parse(await req.json());
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const name = input.name.trim();
  const duplicate = await db.apiKey.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      revokedAt: null,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicate) {
    return jsonError("You already have an API key with this name.", 400);
  }

  const { fullKey, prefix, hash } = generateApiKey(input.environment);

  const { isOwnerEmail } = await import("@/lib/quota");
  const { websitePlanToKeyPlan } = await import("@/lib/billing/sync");
  const userRow = await db.user.findUnique({
    where: { id: user.id },
    select: { plan: true },
  });
  const websitePlan = isOwnerEmail(user.email)
    ? "OWNER"
    : (userRow?.plan ?? "FREE");
  const plan = websitePlanToKeyPlan(websitePlan);

  const apiKey = await db.apiKey.create({
    data: {
      userId: user.id,
      name,
      prefix,
      keyHash: hash,
      type: input.type,
      environment: input.environment === "test" ? "TEST" : "LIVE",
      plan,
    },
    select: { id: true, name: true, prefix: true, createdAt: true, plan: true },
  });

  return NextResponse.json({
    ...apiKey,
    key: fullKey,
    warning: "Copy this key now. You will never see it again.",
  });
}
