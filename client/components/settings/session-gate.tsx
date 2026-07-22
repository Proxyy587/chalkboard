"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type User = { id: string; email: string; name: string | null };

export function SessionGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (user === undefined) {
    return <p className="text-[11px] text-zinc-600">Loading session…</p>;
  }

  if (!user) {
    return (
      <div className="max-w-md space-y-4">
        <div className="border border-white/10 bg-black/30 p-4">
          <h2 className="text-sm tracking-[0.12em] text-zinc-300">SIGN IN</h2>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Enter your email to manage API keys and storage. OAuth can be added later.
          </p>
        </div>
        <form onSubmit={login} className="space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mt-2"
            />
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Continue"}
          </Button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
