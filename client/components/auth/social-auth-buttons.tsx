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
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] text-neutral-600">or continue with</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid gap-2">
        <button
          type="button"
          className="mm-ghost-btn flex h-10 w-full items-center justify-center rounded-none px-3 text-[13px]"
          disabled={loading !== null}
          onClick={() => social("google")}
        >
          {loading === "google" ? "Redirecting…" : "Sign in with Google"}
        </button>
        <button
          type="button"
          className="mm-ghost-btn flex h-10 w-full items-center justify-center rounded-none px-3 text-[13px]"
          disabled={loading !== null}
          onClick={() => social("github")}
        >
          {loading === "github" ? "Redirecting…" : "Sign in with GitHub"}
        </button>
      </div>
      {error && <p className="text-[12px] text-red-400">{error}</p>}
    </div>
  );
}
