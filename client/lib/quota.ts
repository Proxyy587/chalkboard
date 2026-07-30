import { createHash } from "crypto";

import { db } from "@/lib/db";

export const GUEST_LIFETIME_LIMIT = 1;
export const FREE_DAILY_LIMIT = 3;

/** True unlimited (owner / enterprise). Paid Hobby/Pro use monthly renderCredits. */
const UNLIMITED_PLANS = new Set(["ENTERPRISE", "OWNER"]);

export function utcMonth(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(`mm-ip:${ip}`).digest("hex").slice(0, 32);
}

export function isUnlimitedPlan(plan: string | null | undefined): boolean {
  if (!plan) return false;
  return UNLIMITED_PLANS.has(plan.toUpperCase());
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.OWNER_EMAILS?.trim() ?? "";
  if (!raw) return false;
  const set = new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
  return set.has(email.trim().toLowerCase());
}

type QuotaResult =
  | { ok: true; remaining: number; limit: number }
  | { ok: false; error: string; remaining: 0; limit: number };

async function readCount(subject: string, window: string): Promise<number> {
  const row = await db.generationQuota.findUnique({
    where: { subject_window: { subject, window } },
    select: { count: true },
  });
  return row?.count ?? 0;
}

async function bump(subject: string, window: string): Promise<number> {
  const row = await db.generationQuota.upsert({
    where: { subject_window: { subject, window } },
    create: { subject, window, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  return row.count;
}

/** Guest: 1 video ever per IP (survives cache clear). */
export async function checkGuestQuota(ip: string): Promise<QuotaResult> {
  const subject = `ip:${hashIp(ip)}`;
  const count = await readCount(subject, "lifetime");
  const limit = GUEST_LIFETIME_LIMIT;
  if (count >= limit) {
    return {
      ok: false,
      remaining: 0,
      limit,
      error:
        "Guest limit reached (1 free video per network). Sign in to generate more — free accounts get 3 per day.",
    };
  }
  return { ok: true, remaining: limit - count, limit };
}

export async function consumeGuestQuota(ip: string): Promise<void> {
  await bump(`ip:${hashIp(ip)}`, "lifetime");
}

/** Signed-in free tier: 3 videos / UTC day. */
export async function checkUserDailyQuota(
  userId: string,
  opts?: { unlimited?: boolean }
): Promise<QuotaResult> {
  if (opts?.unlimited) {
    return { ok: true, remaining: 999, limit: 999 };
  }
  const subject = `user:${userId}`;
  const window = utcDay();
  const count = await readCount(subject, window);
  const limit = FREE_DAILY_LIMIT;
  if (count >= limit) {
    return {
      ok: false,
      remaining: 0,
      limit,
      error: `Daily limit reached (${limit} videos / day on the free plan). Try again tomorrow.`,
    };
  }
  return { ok: true, remaining: limit - count, limit };
}

export async function consumeUserDailyQuota(userId: string): Promise<void> {
  await bump(`user:${userId}`, utcDay());
}

/**
 * Account-level quota for website demo (master key path).
 * FREE → daily. HOBBY/PRO → monthly renderCredits. OWNER → unlimited.
 */
export async function checkAccountRenderQuota(
  userId: string,
  opts?: { ownerEmail?: boolean }
): Promise<QuotaResult & { mode: "daily" | "monthly" | "unlimited" }> {
  if (opts?.ownerEmail) {
    return { ok: true, remaining: 9999, limit: 9999, mode: "unlimited" };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      renderCredits: true,
      billingPeriod: true,
    },
  });

  const plan = (user?.plan ?? "FREE").toUpperCase();
  if (isUnlimitedPlan(plan) || opts?.ownerEmail) {
    return { ok: true, remaining: 9999, limit: 9999, mode: "unlimited" };
  }

  if (plan === "HOBBY" || plan === "PRO") {
    const period = utcMonth();
    let credits = user?.renderCredits ?? 0;
    // Soft reset if period rolled and webhook didn't refill yet
    if (user?.billingPeriod && user.billingPeriod !== period && credits <= 0) {
      return {
        ok: false,
        remaining: 0,
        limit: 0,
        mode: "monthly",
        error:
          "Monthly renders exhausted. Renew or wait for the next billing period.",
      };
    }
    if (credits <= 0) {
      return {
        ok: false,
        remaining: 0,
        limit: 0,
        mode: "monthly",
        error:
          "No renders left this month. Upgrade or wait for renewal.",
      };
    }
    return { ok: true, remaining: credits, limit: credits, mode: "monthly" };
  }

  const daily = await checkUserDailyQuota(userId);
  return { ...daily, mode: "daily" };
}

export async function consumeAccountRender(
  userId: string,
  mode: "daily" | "monthly" | "unlimited"
): Promise<void> {
  if (mode === "unlimited") return;
  if (mode === "daily") {
    await consumeUserDailyQuota(userId);
    return;
  }
  await db.user.update({
    where: { id: userId },
    data: { renderCredits: { decrement: 1 } },
  });
}
