import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";

const githubClientId = process.env.GITHUB_CLIENT_ID?.trim();
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();

const appUrl =
  process.env.BETTER_AUTH_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3000";

const isProdManimotion =
  /manimotion\.dev$/i.test(
    (() => {
      try {
        return new URL(appUrl).hostname;
      } catch {
        return "";
      }
    })()
  );

export const auth = betterAuth({
  appName: "manimotion",
  baseURL: appUrl,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Mock until Resend/SMTP is wired for VPS
      console.log(`[auth] Password reset for ${user.email}: ${url}`);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      console.log(`[auth] Verify email for ${user.email}: ${url}`);
    },
  },
  socialProviders: {
    ...(githubClientId && githubClientSecret
      ? {
          github: {
            clientId: githubClientId,
            clientSecret: githubClientSecret,
            scope: ["read:user", "user:email"],
          },
        }
      : {}),
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github"],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
    },
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://manimotion.dev",
    "https://www.manimotion.dev",
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i),
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    // Keep sessions working on both apex and www.
    ...(isProdManimotion
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: ".manimotion.dev",
          },
        }
      : {}),
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
