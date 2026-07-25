"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
    router.push("/settings");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="mm-panel w-full max-w-md space-y-6 p-6">
        <div>
          <Link href="/" className="mm-brand text-lg font-semibold">
            manimotion
          </Link>
          <h1 className="mt-4 text-[14px] text-zinc-200">Create account</h1>
          <p className="mt-1 text-[12px] text-zinc-500">
            Same account powers API keys and storage
          </p>
        </div>

        <SocialAuthButtons callbackURL="/settings" />

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2"
              placeholder="Optional"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2"
              placeholder="At least 8 characters"
            />
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <Button type="submit" className="w-full rounded-none" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>

        <p className="text-[11px] text-zinc-600">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-[var(--mm-accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
