"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useSession } from "@/lib/auth-client";
import type { PlanId } from "@/lib/billing/plans";

export function PricingActions({
  planId,
  highlighted,
}: {
  planId: PlanId;
  highlighted?: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (planId === "FREE") {
    return (
      <Link
        href={session?.user ? "/" : "/sign-up"}
        className="mm-ghost-btn flex h-10 w-full items-center justify-center text-[13px]"
      >
        {session?.user ? "Open demo" : "Start free"}
      </Link>
    );
  }

  async function upgrade() {
    if (!session?.user) {
      router.push(`/sign-in?next=/pricing`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      const url = data.checkout_url as string | undefined;
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void upgrade()}
      className={
        highlighted
          ? "flex h-10 w-full items-center justify-center rounded-[9px] bg-foreground text-[13px] font-medium text-background disabled:opacity-50"
          : "mm-ghost-btn flex h-10 w-full items-center justify-center text-[13px] disabled:opacity-50"
      }
    >
      {loading ? "Redirecting…" : `Upgrade to ${planId === "HOBBY" ? "Hobby" : "Pro"}`}
    </button>
  );
}
