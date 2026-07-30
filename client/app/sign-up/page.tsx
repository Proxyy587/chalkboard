"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthGuestOnly } from "@/components/auth/auth-guest-only";

export default function SignUpPage() {
  return (
    <AuthGuestOnly>
      <AuthCard initialMode="sign-up" />
    </AuthGuestOnly>
  );
}
