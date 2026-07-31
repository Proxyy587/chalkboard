import { db } from "@/lib/db";
import { hashApiKey, isChalkApiKeyFormat } from "@/lib/api-keys/generate";
import { websitePlanToKeyPlan } from "@/lib/billing/sync";

export type ValidatedApiKey = {
  apiKeyId: string;
  userId: string;
  /** Always the account plan (FREE|HOBBY|PRO|OWNER), not a stale key snapshot */
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
      user: { select: { plan: true } },
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

  const accountPlan = (apiKey.user?.plan ?? "FREE").toUpperCase();
  const cachePlan = websitePlanToKeyPlan(accountPlan);
  void meta;

  db.apiKey
    .update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        lastUsedIp: meta?.ip ?? undefined,
        usageCount: { increment: 1 },
        // Keep cache row aligned with account
        plan: cachePlan,
      },
    })
    .catch(() => {});

  return {
    valid: true,
    data: {
      apiKeyId: apiKey.id,
      userId: apiKey.userId,
      plan: accountPlan,
      scopes: apiKey.scopes,
      credits: Number(apiKey.credits),
      creditLimit: apiKey.creditLimit ? Number(apiKey.creditLimit) : null,
    },
  };
}
