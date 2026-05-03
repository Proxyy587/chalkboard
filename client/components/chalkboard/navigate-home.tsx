"use client";

import { useRouter } from "next/navigation";

import { useMountEffect } from "@/hooks/use-mount-effect";

/** Redirect to `/` once on mount — use when render already decided the route is invalid. */
export function NavigateHome() {
  const router = useRouter();
  useMountEffect(() => {
    router.replace("/");
  });
  return null;
}
