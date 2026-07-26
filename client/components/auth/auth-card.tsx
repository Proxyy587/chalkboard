"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { signIn, signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Mode = "sign-in" | "sign-up";

export function AuthCard({ initialMode = "sign-in" }: { initialMode?: Mode }) {
  const router = useRouter();
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

    if (mode === "sign-in") {
      const { error: err } = await signIn.email({
        email: email.trim(),
        password,
        callbackURL: "/settings",
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
        callbackURL: "/settings",
      });
      setLoading(false);
      if (err) {
        setError(err.message || "Sign up failed");
        return;
      }
    }

    router.push("/settings");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-black p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="pointer-events-none absolute -left-20 top-10 h-[420px] w-[520px] opacity-[0.07]">
        <svg viewBox="0 0 800 400" className="size-full text-white" fill="none" stroke="currentColor" strokeWidth="0.6">
          <path d="M40 80h120v60H40zM180 40h90v100h-90zM290 100h160v80H290zM480 60h140v120H480zM640 120h100v90H640zM80 200h200v100H80zM320 220h180v90H320zM540 240h200v80H540z" />
          <path d="M0 180h800M0 280h800M200 0v400M500 0v400" opacity="0.4" />
        </svg>
      </div>

      <div className="relative z-[1] mb-8">
        <Link href="/" className="mm-brand text-sm tracking-[0.08em]">
          manimotion.
        </Link>
      </div>

      <div className="relative z-[1] w-full max-w-[420px] border border-white/10 bg-black">
        <div className="flex border-b border-white/10">
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
                window.history.replaceState(null, "", tab.href);
              }}
              className={cn(
                "flex-1 px-4 py-3 text-[13px] font-medium transition-colors",
                mode === tab.id
                  ? "border-b-2 border-white text-white"
                  : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6 p-6 md:p-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              {mode === "sign-in" ? "Sign In" : "Create account"}
            </h1>
            <p className="mt-1.5 text-[13px] text-neutral-500">
              {mode === "sign-in"
                ? "Enter your email below to login to your account."
                : "Start with Google, GitHub, or email."}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "sign-up" && (
              <div>
                <Label htmlFor="name" className="text-neutral-200">
                  Name
                </Label>
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
              <Label htmlFor="email" className="text-neutral-200">
                Email
              </Label>
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
                <Label htmlFor="password" className="text-neutral-200">
                  Password
                </Label>
                {mode === "sign-in" && (
                  <span className="text-[12px] text-neutral-500 underline-offset-2">
                    Forgot your password?
                  </span>
                )}
              </div>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-neutral-300"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {mode === "sign-in" && (
              <label className="flex items-center gap-2 text-[13px] text-neutral-400">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-3.5 rounded-none border border-white/20 bg-black accent-white"
                />
                Remember me
              </label>
            )}

            {error && <p className="text-[13px] text-red-400">{error}</p>}

            <Button type="submit" className="h-10 w-full rounded-none" disabled={loading}>
              {loading
                ? mode === "sign-in"
                  ? "Signing in…"
                  : "Creating…"
                : mode === "sign-in"
                  ? "Login"
                  : "Create account"}
            </Button>
          </form>

          <SocialAuthButtons callbackURL="/settings" />

          <p className="text-center text-[11px] leading-relaxed text-neutral-600">
            By continuing, you agree to the Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      <p className="relative z-[1] mt-6 text-[12px] text-neutral-600">
        <Link href="/" className="hover:text-neutral-300">
          ← Back to demo
        </Link>
      </p>
    </div>
  );
}
