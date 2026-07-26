"use client";

import { useState } from "react";

import { signIn } from "@/lib/auth-client";

export function SocialAuthButtons({
  callbackURL = "/settings",
}: {
  callbackURL?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function socialGithub() {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await signIn.social({
        provider: "github",
        callbackURL,
      });
      if (err) {
        setError(err.message || "GitHub sign-in failed");
        setLoading(false);
      }
      // On success Better Auth redirects — leave loading true
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not reach auth server. Check your connection and try again."
      );
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] text-[var(--muted-2)]">or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        className="mm-ghost-btn flex h-10 w-full items-center justify-center px-3 text-[13px]"
        disabled={loading}
        onClick={() => void socialGithub()}
      >
        {loading ? "Redirecting…" : "Sign in with GitHub"}
      </button>
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
