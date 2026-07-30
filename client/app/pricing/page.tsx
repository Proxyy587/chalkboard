import type { Metadata } from "next";

import { PLANS } from "@/lib/billing/plans";
import { pageMetadata } from "@/lib/seo";
import { PricingActions } from "@/components/billing/pricing-actions";
import { ConsoleShell } from "@/components/layout/console-shell";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "manimotion pricing — sell renders. Free API with fast models; Hobby & Pro unlock stronger LLMs. Pro includes ~80 renders/mo.",
  path: "/pricing",
  keywords: ["manimotion pricing", "video API pricing", "render subscription"],
});

export default function PricingPage() {
  return (
    <ConsoleShell
      section="pricing"
      contentClassName="mx-auto w-full max-w-5xl px-5 py-10 md:px-8 md:py-12"
    >
      <p className="mm-label">Pricing</p>
      <h1 className="mt-2 text-[2rem] font-bold tracking-[-0.02em] text-foreground md:text-[2.4rem]">
        Pay for renders. Quality is the upgrade.
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--muted-text)]">
        Free includes API access with fast models. Hobby and Pro unlock stronger
        LLMs — Pro gets Opus-class quality and 80 renders a month.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <article
            key={plan.id}
            className={`flex flex-col rounded-[12px] border p-6 ${
              plan.highlighted
                ? "border-foreground bg-[var(--surface)] shadow-[0_12px_40px_color-mix(in_oklab,var(--ink)_6%,transparent)]"
                : "border-[var(--chip-line)] bg-[var(--surface)]"
            }`}
          >
            <p className="text-[11px] font-medium tracking-[0.08em] text-[var(--muted-2)]">
              {plan.name.toUpperCase()}
            </p>
            <p className="mt-3 text-[2rem] font-bold tracking-tight text-foreground">
              {plan.priceLabel}
              {plan.priceUsd > 0 && (
                <span className="text-[13px] font-normal text-[var(--muted-text)]">
                  /mo
                </span>
              )}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted-text)]">
              {plan.blurb}
            </p>
            <p className="mt-4 text-[13px] font-medium text-foreground">
              {plan.rendersLabel}
            </p>
            <p className="mt-1 text-[12px] text-[var(--muted-2)]">
              {plan.modelTier}
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-[13px] text-[var(--ink-soft)]">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-[var(--muted-2)]">·</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <PricingActions
                planId={plan.id}
                highlighted={plan.highlighted}
              />
            </div>
          </article>
        ))}
      </div>

      <section className="mt-14 max-w-2xl">
        <h2 className="text-[1.1rem] font-bold text-foreground">
          How we keep costs under control
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-[var(--ink-soft)]">
          <li>
            Free users get the API and fast models — capped at a few renders per
            day.
          </li>
          <li>
            Paid plans buy a monthly <strong>render quota</strong>. The real
            upgrade is model quality (Sonnet → Opus), not endless renders.
          </li>
          <li>
            Later: optional Bring-Your-Own OpenRouter key so heavy users cover
            their own LLM bill (you still meter renders).
          </li>
        </ul>
      </section>
    </ConsoleShell>
  );
}
