import { db } from "@/lib/db";
import { hashApiKey, isChalkApiKeyFormat } from "@/lib/api-keys/generate";

export type ValidatedApiKey = {
  apiKeyId: string;
  userId: string;
  plan: string;
  scopes: string[];
  credits: number;
  creditLimit: number | null;
};

export async function validateApiKey(
  key: string,
  meta?: { ip?: string; userAgent?: string }
): Promise<{ valid: true; data: ValidatedApiKey } | { valid: false; error: string }> {
  if (!key?.trim()) {
    return { valid: false, error: "Missing API key" };
  }
  if (!isChalkApiKeyFormat(key)) {
    return { valid: false, error: "Invalid API key format" };
  }

  const keyHash = hashApiKey(key.trim());
  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      userId: true,
      plan: true,
      scopes: true,
      credits: true,
      creditLimit: true,
      isActive: true,
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (!apiKey) {
    return { valid: false, error: "Invalid API key" };
  }
  if (!apiKey.isActive || apiKey.revokedAt) {
    return { valid: false, error: "API key has been revoked" };
  }
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Credits enforcement wired later — schema ready, no blocking on FREE for now
  void meta;

  db.apiKey
    .update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        lastUsedIp: meta?.ip ?? undefined,
        usageCount: { increment: 1 },
      },
    })
    .catch(() => {});

  return {
    valid: true,
    data: {
      apiKeyId: apiKey.id,
      userId: apiKey.userId,
      plan: apiKey.plan,
      scopes: apiKey.scopes,
      credits: Number(apiKey.credits),
      creditLimit: apiKey.creditLimit ? Number(apiKey.creditLimit) : null,
    },
  };
}
