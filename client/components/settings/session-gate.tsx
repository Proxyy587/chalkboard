"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/auth-client";

export function SessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <p className="text-[11px] text-zinc-600">Loading session…</p>;
  }

  if (!session?.user) {
    return (
      <div className="mm-panel max-w-md space-y-4 p-5">
        <p className="mm-label">Sign in</p>
        <h2 className="text-[14px] text-zinc-200">Account required</h2>
        <p className="text-[12px] leading-relaxed text-zinc-500">
          Sign in to manage API keys and storage. You can still try the demo from home without an
          account.
        </p>
        <div className="flex flex-wrap gap-2">
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
            Try demo
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
