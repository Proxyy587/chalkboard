import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Sign up",
  description:
    "Create a free manimotion account — generate educational videos from prompts, get an API key, and ship explainers to your bucket.",
  path: "/sign-up",
  keywords: ["manimotion signup", "create account", "free video API"],
});

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
