"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { useSession } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/auth/redirect";

function AuthGuestOnlyInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const nextPath = safeNextPath(searchParams.get("next"), "/");

  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace(nextPath);
    }
  }, [isPending, session?.user, router, nextPath]);

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-[13px] text-[var(--muted-2)]">
        Loading…
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-[13px] text-[var(--muted-2)]">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}

/** Redirect authenticated users away from sign-in / sign-up (honors ?next=). */
export function AuthGuestOnly({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-[13px] text-[var(--muted-2)]">
          Loading…
        </div>
      }
    >
      <AuthGuestOnlyInner>{children}</AuthGuestOnlyInner>
    </Suspense>
  );
}
