"use client";

import { useState } from "react";

import { signIn } from "@/lib/auth-client";

type Provider = "google" | "github";

export function SocialAuthButtons({ callbackURL = "/settings" }: { callbackURL?: string }) {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function social(provider: Provider) {
    setLoading(provider);
    setError(null);
    const { error: err } = await signIn.social({
      provider,
      callbackURL,
    });
    if (err) {
      setError(err.message || `${provider} sign-in failed`);
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <button
          type="button"
          className="mm-ghost-btn w-full px-3 py-2.5 text-[12px]"
          disabled={loading !== null}
          onClick={() => social("google")}
        >
          {loading === "google" ? "Redirecting…" : "Continue with Google"}
        </button>
        <button
          type="button"
          className="mm-ghost-btn w-full px-3 py-2.5 text-[12px]"
          disabled={loading !== null}
          onClick={() => social("github")}
        >
          {loading === "github" ? "Redirecting…" : "Continue with GitHub"}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[9px] tracking-[0.16em] text-zinc-600">OR</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
    </div>
  );
}
