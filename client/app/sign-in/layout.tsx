import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Sign in",
  description:
    "Sign in to manimotion to save videos, manage API keys, and connect your own R2 or S3 storage.",
  path: "/sign-in",
  keywords: ["manimotion login", "sign in"],
});

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
