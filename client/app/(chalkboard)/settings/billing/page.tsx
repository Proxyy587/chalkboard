"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getPlan } from "@/lib/billing/plans";
import { readJsonSafe } from "@/lib/http";

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
  const checkoutSuccess = params.get("checkout") === "success";

  async function loadMe() {
    const res = await fetch("/api/billing/me", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load billing");
    return readJsonSafe<BillingMe>(res);
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (checkoutSuccess) {
          toast.message("Confirming payment…", {
            description: "Syncing your plan from Dodo (webhook or reconcile).",
          });
          // Poll reconcile a few times — webhooks are flaky on localhost.
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
              toast.success(`You're on ${data.plan}. API keys updated.`);
              break;
            }
            await new Promise((r) => setTimeout(r, 1500));
          }
          if (!cancelled) {
            const latest = await loadMe();
            setMe(latest);
            if (latest.plan === "FREE") {
              toast.message("Still on Free", {
                description:
                  "If you paid, wait a moment or check Dodo webhook URL / signing secret.",
              });
            }
          }
        } else {
          setMe(await loadMe());
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
  }, [checkoutSuccess]);

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
          costs stay bounded. API keys always inherit this account plan.
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  void (async () => {
                    setLoading(true);
                    try {
                      const res = await fetch("/api/billing/reconcile", {
                        method: "POST",
                        credentials: "include",
                      });
                      const data = await readJsonSafe<BillingMe & { synced?: boolean }>(
                        res
                      );
                      setMe({
                        plan: data.plan ?? "FREE",
                        renderCredits: data.renderCredits ?? 0,
                        subscriptionStatus: data.subscriptionStatus ?? null,
                        billingPeriod: data.billingPeriod ?? null,
                      });
                      toast.success(
                        data.synced
                          ? `Plan synced: ${data.plan}`
                          : `Still ${data.plan ?? "FREE"}`
                      );
                    } catch {
                      toast.error("Could not refresh billing");
                    } finally {
                      setLoading(false);
                    }
                  })();
                }}
              >
                Refresh plan
              </Button>
              {me?.plan !== "FREE" && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const w = window.open(
                      "/api/portal",
                      "_blank",
                      "noopener,noreferrer"
                    );
                    if (!w) {
                      toast.error("Allow pop-ups to open the billing portal");
                    }
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
