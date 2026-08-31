"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getPlan, PLANS, PLAN_RANK } from "@/lib/billing/plans";
import { LECTURE_MODELS } from "@/lib/chalkboard-api";
import { readJsonSafe } from "@/lib/http";

type BillingMe = {
  plan: string;
  renderCredits: number;
  subscriptionStatus: string | null;
  billingPeriod: string | null;
};

// ─── helpers ────────────────────────────────────────────────────────────────

function usageColor(pct: number): string {
  if (pct >= 85) return "bg-red-500";
  if (pct >= 60) return "bg-yellow-400";
  return "bg-emerald-500";
}

function progressPct(used: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

// ─── success banner ──────────────────────────────────────────────────────────

function CheckoutSuccessBanner({
  planName,
  onDismiss,
}: {
  planName: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[12px] border border-emerald-500/30 bg-emerald-500/8 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none">🎉</span>
        <div>
          <p className="text-[13px] font-semibold text-foreground">
            You&apos;re on {planName}!
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--muted-text)]">
            Your models and render quotas have been updated.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-[var(--muted-2)] transition-colors hover:text-foreground"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

// ─── current plan card ───────────────────────────────────────────────────────

function PlanCard({ me }: { me: BillingMe }) {
  const plan = getPlan(me.plan);
  const isFree = plan.id === "FREE";

  // For free: use dailyRenders as denominator; for paid: monthlyRenders
  const quota = isFree ? (plan.dailyRenders ?? 3) : (plan.monthlyRenders ?? 0);
  const used = quota - me.renderCredits;
  const pct = progressPct(Math.max(0, used), quota);
  const barColor = usageColor(pct);

  const periodLabel = isFree
    ? "Resets daily at midnight UTC"
    : me.billingPeriod
      ? `Resets ${me.billingPeriod}`
      : "Resets monthly";

  return (
    <section className="rounded-[12px] border border-[var(--chip-line)] bg-[var(--surface)] p-5">
      {/* Plan identity */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mm-label">Current plan</p>
          <p className="mt-1.5 text-[1.5rem] font-bold leading-none tracking-tight text-foreground">
            {plan.name}
          </p>
          <p className="mt-1 text-[13px] text-[var(--muted-text)]">
            {plan.priceUsd === 0
              ? "Free forever"
              : `${plan.priceLabel} / month`}
            {me.subscriptionStatus && me.subscriptionStatus !== "active"
              ? ` · ${me.subscriptionStatus}`
              : ""}
          </p>
        </div>

        <span
          className={[
            "mt-1 rounded-[6px] px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em]",
            isFree
              ? "border border-[var(--chip-line)] bg-[var(--chip)] text-[var(--muted-text)]"
              : me.subscriptionStatus === "active"
                ? "border border-emerald-500/30 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400"
                : "border border-yellow-500/30 bg-yellow-500/8 text-yellow-600 dark:text-yellow-400",
          ].join(" ")}
        >
          {isFree ? "FREE" : (me.subscriptionStatus?.toUpperCase() ?? "ACTIVE")}
        </span>
      </div>

      {/* Usage bar */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[12px] font-medium text-[var(--ink-soft)]">
            Renders this period
          </p>
          <p className="text-[12px] text-[var(--muted-text)]">
            <span className="font-semibold text-foreground">
              {me.renderCredits}
            </span>{" "}
            / {quota} remaining
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--chip-line)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--muted-2)]">
          {periodLabel}
        </p>
      </div>
    </section>
  );
}

// ─── models section ───────────────────────────────────────────────────────────

function ModelsSection({ me }: { me: BillingMe }) {
  const planRank =
    PLAN_RANK[(me.plan?.toUpperCase() ?? "FREE") as keyof typeof PLAN_RANK] ??
    0;

  return (
    <section className="rounded-[12px] border border-[var(--chip-line)] bg-[var(--surface)] p-5">
      <p className="mm-label">Models unlocked</p>
      <p className="mt-1 text-[12px] text-[var(--muted-text)]">
        All API keys on this account inherit these model permissions.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {LECTURE_MODELS.map((m) => {
          const modelRank = PLAN_RANK[m.minPlan] ?? 0;
          const unlocked = planRank >= modelRank;
          const requiredPlan = PLANS.find((p) => p.id === m.minPlan);

          return (
            <div key={m.id} className="relative group">
              <div
                className={[
                  "flex items-center gap-2 rounded-[8px] border px-2.5 py-1.5",
                  unlocked
                    ? "border-[var(--chip-line)] bg-[var(--chip)]"
                    : "border-[var(--chip-line)] bg-transparent opacity-50",
                ].join(" ")}
              >
                {!unlocked && <span className="text-[11px]">🔒</span>}
                <span
                  className={[
                    "text-[12px] font-medium",
                    unlocked ? "text-foreground" : "text-[var(--muted-2)]",
                  ].join(" ")}
                >
                  {m.label}
                </span>
                {m.badge && unlocked && (
                  <span className="rounded-[4px] border border-[var(--chip-line)] bg-[var(--surface)] px-1.5 py-px text-[10px] text-[var(--muted-text)]">
                    {m.badge}
                  </span>
                )}
                {!unlocked && requiredPlan && (
                  <span className="text-[10px] text-[var(--muted-2)]">
                    {requiredPlan.name}+
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upgrade nudge for locked models */}
      {planRank < 2 && (
        <p className="mt-3 text-[12px] text-[var(--muted-text)]">
          {planRank === 0 ? (
            <>
              Locked models require{" "}
              <Link
                href="/pricing"
                className="text-foreground underline underline-offset-2 hover:no-underline"
              >
                Hobby or Pro
              </Link>
              .
            </>
          ) : (
            <>
              Claude Opus 4 requires{" "}
              <Link
                href="/pricing"
                className="text-foreground underline underline-offset-2 hover:no-underline"
              >
                Pro
              </Link>
              .
            </>
          )}
        </p>
      )}
    </section>
  );
}

// ─── features summary ─────────────────────────────────────────────────────────

function PlanFeatures({ me }: { me: BillingMe }) {
  const plan = getPlan(me.plan);

  return (
    <section className="rounded-[12px] border border-[var(--chip-line)] bg-[var(--surface)] p-5">
      <p className="mm-label">What&apos;s included</p>
      <ul className="mt-3 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px]">
            <span className="mt-0.5 shrink-0 text-[var(--muted-2)]">✓</span>
            <span className="text-[var(--ink-soft)]">{f}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── usage info section ───────────────────────────────────────────────────────

function UsageInfo({ me }: { me: BillingMe }) {
  const plan = getPlan(me.plan);
  const isFree = plan.id === "FREE";

  return (
    <section className="rounded-[12px] border border-[var(--chip-line)] bg-[var(--surface)] p-5">
      <p className="mm-label">Usage info</p>
      <div className="mt-3 space-y-1.5">
        <p className="text-[13px] text-[var(--ink-soft)]">
          <span className="font-semibold text-foreground">
            {me.renderCredits}
          </span>{" "}
          renders remaining this period.
        </p>
        <p className="text-[12px] text-[var(--muted-text)]">
          {isFree
            ? "Your 3 renders/day reset at midnight UTC. Each video generation — regardless of length — uses 1 render."
            : `Your ${plan.rendersLabel} reset at the start of each billing month. Each generation uses 1 render regardless of video length.`}
        </p>
        {isFree && (
          <p className="mt-3 text-[12px] text-[var(--muted-text)]">
            Need more renders?{" "}
            <Link
              href="/pricing"
              className="text-foreground underline underline-offset-2 hover:no-underline"
            >
              Upgrade to Hobby or Pro
            </Link>{" "}
            for a monthly quota and better models.
          </p>
        )}
      </div>
    </section>
  );
}

// ─── action buttons ───────────────────────────────────────────────────────────

function BillingActions({
  me,
  onRefresh,
  refreshing,
}: {
  me: BillingMe;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const planId = (me.plan?.toUpperCase() ?? "FREE") as "FREE" | "HOBBY" | "PRO";

  function openPortal() {
    const w = window.open("/api/portal", "_blank", "noopener,noreferrer");
    if (!w) toast.error("Allow pop-ups to open the billing portal.");
  }

  return (
    <div className="flex flex-wrap gap-2">
      {planId === "FREE" && (
        <>
          <Link href="/pricing">
            <Button type="button">Upgrade to Hobby</Button>
          </Link>
          <Link href="/pricing">
            <Button type="button" variant="ghost">
              View all plans
            </Button>
          </Link>
        </>
      )}

      {planId === "HOBBY" && (
        <>
          <Link href="/pricing">
            <Button type="button">Upgrade to Pro</Button>
          </Link>
          <Button type="button" variant="outline" onClick={openPortal}>
            Manage subscription
          </Button>
          <Link href="/pricing">
            <Button type="button" variant="ghost">
              View plans
            </Button>
          </Link>
        </>
      )}

      {planId === "PRO" && (
        <>
          <Button type="button" onClick={openPortal}>
            Manage subscription
          </Button>
          <Link href="/pricing">
            <Button type="button" variant="ghost">
              View plans
            </Button>
          </Link>
        </>
      )}

      <Button
        type="button"
        variant="ghost"
        disabled={refreshing}
        onClick={onRefresh}
      >
        {refreshing ? "Syncing…" : "Refresh plan"}
      </Button>
    </div>
  );
}

// ─── inner (needs useSearchParams) ───────────────────────────────────────────

function BillingInner() {
  const params = useSearchParams();
  const [me, setMe] = useState<BillingMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const checkoutSuccess = params.get("checkout") === "success";

  const loadMe = useCallback(async (): Promise<BillingMe> => {
    const res = await fetch("/api/billing/me", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load billing");
    return readJsonSafe<BillingMe>(res);
  }, []);

  // Initial load + optional reconcile after checkout
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (checkoutSuccess) {
          toast.message("Confirming payment…", {
            description: "Syncing your plan from payment provider.",
          });

          for (let i = 0; i < 8; i++) {
            const res = await fetch("/api/billing/reconcile", {
              method: "POST",
              credentials: "include",
            });
            const data = await readJsonSafe<{
              plan?: string;
              renderCredits?: number;
              subscriptionStatus?: string | null;
              synced?: boolean;
            }>(res);

            if (!cancelled && data.plan) {
              setMe({
                plan: data.plan,
                renderCredits: data.renderCredits ?? 0,
                subscriptionStatus: data.subscriptionStatus ?? null,
                billingPeriod: null,
              });
            }

            if (data.synced && data.plan && data.plan !== "FREE") {
              break;
            }
            await new Promise<void>((r) => setTimeout(r, 1500));
          }

          if (!cancelled) {
            const latest = await loadMe();
            if (!cancelled) setMe(latest);
          }
        } else {
          const data = await loadMe();
          if (!cancelled) setMe(data);
        }
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkoutSuccess, loadMe]);

  // Manual refresh
  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/billing/reconcile", {
        method: "POST",
        credentials: "include",
      });
      const data = await readJsonSafe<BillingMe & { synced?: boolean }>(res);
      setMe({
        plan: data.plan ?? "FREE",
        renderCredits: data.renderCredits ?? 0,
        subscriptionStatus: data.subscriptionStatus ?? null,
        billingPeriod: data.billingPeriod ?? null,
      });
      toast.success(
        data.synced
          ? `Plan synced: ${data.plan}`
          : `Still on ${data.plan ?? "Free"}`,
      );
    } catch {
      toast.error("Could not refresh billing");
    } finally {
      setRefreshing(false);
    }
  }

  const plan = getPlan(me?.plan);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header>
        <p className="mm-label">Billing</p>
        <h1 className="mt-1 text-[1.25rem] font-bold tracking-[-0.02em] text-foreground">
          Plan &amp; usage
        </h1>
        <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-[var(--muted-text)]">
          Each render costs one credit, regardless of video length. Free users
          get a daily cap; paid plans run on a monthly quota.
        </p>
      </header>

      {/* Checkout success banner */}
      {checkoutSuccess &&
        !bannerDismissed &&
        !loading &&
        me &&
        me.plan !== "FREE" && (
          <CheckoutSuccessBanner
            planName={plan.name}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}

      {loading ? (
        <div className="rounded-[12px] border border-[var(--chip-line)] bg-[var(--surface)] p-5">
          <p className="text-[13px] text-[var(--muted-2)]">Loading billing…</p>
        </div>
      ) : me === null ? (
        <div className="rounded-[12px] border border-[var(--chip-line)] bg-[var(--surface)] p-5">
          <p className="text-[13px] text-[var(--muted-text)]">
            Could not load billing data.{" "}
            <button
              type="button"
              className="text-foreground underline underline-offset-2 hover:no-underline"
              onClick={() => {
                setLoading(true);
                loadMe()
                  .then((d) => setMe(d))
                  .catch(() => setMe(null))
                  .finally(() => setLoading(false));
              }}
            >
              Retry
            </button>
          </p>
        </div>
      ) : (
        <>
          {/* Current plan + usage bar */}
          <PlanCard me={me} />

          {/* Action buttons */}
          <BillingActions
            me={me}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />

          {/* Models section */}
          <ModelsSection me={me} />

          {/* Features on current plan */}
          <PlanFeatures me={me} />

          {/* Usage details */}
          <UsageInfo me={me} />
        </>
      )}
    </div>
  );
}

// ─── page export ──────────────────────────────────────────────────────────────

export default function BillingSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <header>
            <p className="mm-label">Billing</p>
            <h1 className="mt-1 text-[1.25rem] font-bold tracking-[-0.02em] text-foreground">
              Plan &amp; usage
            </h1>
          </header>
          <div className="rounded-[12px] border border-[var(--chip-line)] bg-[var(--surface)] p-5">
            <p className="text-[13px] text-[var(--muted-2)]">
              Loading billing…
            </p>
          </div>
        </div>
      }
    >
      <BillingInner />
    </Suspense>
  );
}
