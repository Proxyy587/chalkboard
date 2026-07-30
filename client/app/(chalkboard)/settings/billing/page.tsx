"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getPlan } from "@/lib/billing/plans";

type BillingMe = {
  plan: string;
  renderCredits: number;
  subscriptionStatus: string | null;
  billingPeriod: string | null;
};

function BillingInner() {
  const params = useSearchParams();
  const [me, setMe] = useState<BillingMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.get("checkout") === "success") {
      toast.success("Payment received — plan unlocks when the webhook lands (usually seconds).");
    }
  }, [params]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/billing/me");
        if (!res.ok) throw new Error("Failed to load billing");
        setMe(await res.json());
      } catch {
        setMe(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const plan = getPlan(me?.plan);

  return (
    <div className="space-y-8">
      <header>
        <p className="mm-label">Billing</p>
        <h1 className="mt-1 text-[1.25rem] font-semibold tracking-tight text-foreground">
          Plan & renders
        </h1>
        <p className="mt-2 max-w-lg text-[13px] text-[var(--muted-text)]">
          You buy monthly renders. Free users stay on a daily cap so OpenRouter
          costs stay bounded.
        </p>
      </header>

      <section className="rounded-[12px] border border-[var(--chip-line)] bg-[var(--surface)] p-5">
        {loading ? (
          <p className="text-[13px] text-[var(--muted-2)]">Loading…</p>
        ) : (
          <>
            <p className="text-[11px] tracking-[0.08em] text-[var(--muted-2)]">
              CURRENT PLAN
            </p>
            <p className="mt-2 text-[1.5rem] font-bold text-foreground">
              {plan.name}
            </p>
            <p className="mt-1 text-[13px] text-[var(--muted-text)]">
              {plan.rendersLabel}
              {me?.subscriptionStatus ? ` · ${me.subscriptionStatus}` : ""}
            </p>
            {plan.monthlyRenders != null && (
              <p className="mt-3 text-[13px] text-[var(--ink-soft)]">
                Renders left this period:{" "}
                <strong className="text-foreground">
                  {me?.renderCredits ?? 0}
                </strong>
                {me?.billingPeriod ? ` (${me.billingPeriod})` : ""}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/pricing">
                <Button type="button" variant="outline">
                  View plans
                </Button>
              </Link>
              {me?.plan !== "FREE" && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    window.location.href = "/api/portal";
                  }}
                >
                  Manage subscription
                </Button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function BillingSettingsPage() {
  return (
    <Suspense
      fallback={
        <p className="text-[13px] text-[var(--muted-2)]">Loading billing…</p>
      }
    >
      <BillingInner />
    </Suspense>
  );
}
