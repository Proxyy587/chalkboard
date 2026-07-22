import { createHash, randomBytes, timingSafeEqual } from "crypto";

const PRODUCT_PREFIX = "chalk";

export type GeneratedKey = {
  fullKey: string;
  prefix: string;
  hash: string;
};

export function generateApiKey(environment: "live" | "test" = "live"): GeneratedKey {
  const secret = randomBytes(24).toString("base64url");
  const fullKey = `${PRODUCT_PREFIX}_${environment}_sk_v1_${secret}`;
  const prefix = fullKey.slice(0, 22);
  const hash = hashApiKey(fullKey);
  return { fullKey, prefix, hash };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export function secureCompareHash(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function isChalkApiKeyFormat(key: string): boolean {
  return key.startsWith(`${PRODUCT_PREFIX}_`) && key.includes("_sk_v1_");
}
