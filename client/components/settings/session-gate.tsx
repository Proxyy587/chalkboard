"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/auth-client";

export function SessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="border border-white/10 bg-black/40 p-6">
        <p className="mm-label">Session</p>
        <p className="mt-2 text-[12px] text-zinc-500">Checking…</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="border border-white/10 bg-black/50 p-6 md:p-8">
        <p className="mm-label">Locked</p>
        <h2 className="mt-2 text-[16px] font-semibold tracking-tight text-zinc-100">
          Sign in to open the console
        </h2>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-zinc-500">
          API keys and storage are tied to your account. The home demo still
          works without signing in.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="mm-pixel-btn px-4 py-2"
            onClick={() => router.push("/sign-in")}
          >
            Sign in
          </button>
          <Link href="/sign-up" className="mm-ghost-btn inline-flex px-4 py-2">
            Create account
          </Link>
          <Link href="/" className="mm-ghost-btn inline-flex px-4 py-2">
            Demo
          </Link>
          <Link href="/docs" className="mm-ghost-btn inline-flex px-4 py-2">
            Docs
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
