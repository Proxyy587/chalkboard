"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { ThemeToggle } from "@/components/theme/theme-provider";
import { signIn, signUp } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/auth/redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Mode = "sign-in" | "sign-up";

function AuthCardInner({ initialMode = "sign-in" }: { initialMode?: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"), "/settings");

  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // better-auth: shorter session when Remember me is off
    const callbackURL = nextPath;

    if (mode === "sign-in") {
      const { error: err } = await signIn.email({
        email: email.trim(),
        password,
        callbackURL,
        ...(remember ? {} : { rememberMe: false }),
      });
      setLoading(false);
      if (err) {
        setError(err.message || "Sign in failed");
        return;
      }
    } else {
      const { error: err } = await signUp.email({
        name: name.trim() || email.split("@")[0],
        email: email.trim(),
        password,
        callbackURL,
      });
      setLoading(false);
      if (err) {
        setError(err.message || "Sign up failed");
        return;
      }
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background p-6">
      <div className="pointer-events-none absolute inset-0 mm-grain opacity-60" />
      <div className="absolute right-4 top-4 z-[2]">
        <ThemeToggle />
      </div>

      <div className="relative z-[1] mb-8">
        <Link href="/" className="mm-brand text-[15px]">
          manimotion
        </Link>
      </div>

      <div className="relative z-[1] w-full max-w-[420px] overflow-hidden rounded-[12px] border border-[var(--chip-line)] bg-[var(--surface)] shadow-[0_12px_40px_color-mix(in_oklab,var(--ink)_6%,transparent)]">
        <div className="flex border-b border-border">
          {(
            [
              { id: "sign-in" as const, label: "Sign In", href: "/sign-in" },
              { id: "sign-up" as const, label: "Sign Up", href: "/sign-up" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMode(tab.id);
                setError(null);
                const q = searchParams.get("next");
                const href = q
                  ? `${tab.href}?next=${encodeURIComponent(q)}`
                  : tab.href;
                window.history.replaceState(null, "", href);
              }}
              className={cn(
                "flex-1 px-4 py-3 text-[13px] font-medium transition-colors",
                mode === tab.id
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-[var(--muted-text)] hover:text-[var(--ink-soft)]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6 p-6 md:p-8">
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-foreground">
              {mode === "sign-in" ? "Sign In" : "Create account"}
            </h1>
            <p className="mt-1.5 text-[13px] text-[var(--muted-text)]">
              {mode === "sign-in"
                ? "Enter your email below to login to your account."
                : "Start with GitHub or email. You can save a guest video after signing in."}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "sign-up" && (
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  className="mt-1.5"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Optional"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                className="mt-1.5"
                required
                autoComplete="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "sign-in" && (
                  <span
                    className="text-[12px] text-[var(--muted-2)]"
                    title="Email password reset is not wired yet"
                  >
                    Reset coming soon
                  </span>
                )}
              </div>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete={
                    mode === "sign-in" ? "current-password" : "new-password"
                  }
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--muted-text)] hover:text-foreground"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {mode === "sign-in" && (
              <label className="flex items-center gap-2 text-[13px] text-[var(--ink-soft)]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-3.5 rounded-[4px] border border-[var(--chip-line)] accent-[var(--ink)]"
                />
                Remember me for 7 days
              </label>
            )}

            {error && <p className="text-[13px] text-red-500">{error}</p>}

            <Button type="submit" className="h-10 w-full" disabled={loading}>
              {loading
                ? mode === "sign-in"
                  ? "Signing in…"
                  : "Creating…"
                : mode === "sign-in"
                  ? "Login"
                  : "Create account"}
            </Button>
          </form>

          <SocialAuthButtons callbackURL={nextPath} />

          <p className="text-center text-[11px] leading-relaxed text-[var(--muted-2)]">
            By continuing, you agree to the Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      <p className="relative z-[1] mt-6 text-[12px] text-[var(--muted-text)]">
        <Link href="/" className="hover:text-foreground">
          ← Back to demo
        </Link>
      </p>
    </div>
  );
}

export function AuthCard({ initialMode = "sign-in" }: { initialMode?: Mode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-[13px] text-[var(--muted-2)]">
          Loading…
        </div>
      }
    >
      <AuthCardInner initialMode={initialMode} />
    </Suspense>
  );
}
