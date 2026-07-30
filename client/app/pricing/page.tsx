import type { Metadata } from "next";
import Link from "next/link";

import { PLANS } from "@/lib/billing/plans";
import { pageMetadata } from "@/lib/seo";
import { PricingActions } from "@/components/billing/pricing-actions";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "manimotion pricing — sell renders, not credits. Free to try, Hobby $9, Pro $19 with API access.",
  path: "/pricing",
  keywords: ["manimotion pricing", "video API pricing", "render subscription"],
});

export default function PricingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-8">
        <Link href="/" className="mm-brand text-[13px]">
          manimotion
        </Link>
        <nav className="flex items-center gap-4 text-[12px] text-[var(--muted-text)]">
          <Link href="/docs" className="hover:text-foreground">
            Docs
          </Link>
          <Link href="/settings/billing" className="hover:text-foreground">
            Billing
          </Link>
          <Link href="/sign-in" className="hover:text-foreground">
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
        <p className="mm-label">Pricing</p>
        <h1 className="mt-2 text-[2rem] font-bold tracking-[-0.02em] text-foreground md:text-[2.4rem]">
          Pay for renders. Not mystery credits.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--muted-text)]">
          Free is capped so OpenRouter and the GPU queue stay healthy. Upgrade
          when you ship — Hobby for explainers, Pro when you need the API.
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
              <ul className="mt-4 flex-1 space-y-2 text-[13px] text-[var(--ink-soft)]">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[var(--muted-2)]">·</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <PricingActions planId={plan.id} highlighted={plan.highlighted} />
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
              Free users burn <em>your</em> OpenRouter key — but only a few
              renders per day.
            </li>
            <li>
              Paid users buy a monthly <strong>render quota</strong>, not opaque
              credits.
            </li>
            <li>
              Later: optional Bring-Your-Own OpenRouter key so heavy users cover
              their own LLM bill (you still meter renders).
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
