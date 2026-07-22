import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

import { db } from "@/lib/db";

export type SessionData = {
  userId?: string;
  email?: string;
};

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "dev-only-change-me-32-chars-min!!",
  cookieName: "chalkboard_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  return db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function signInWithEmail(email: string, name?: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new Error("Valid email required");
  }

  const user = await db.user.upsert({
    where: { email: normalized },
    create: { email: normalized, name: name?.trim() || null },
    update: { name: name?.trim() || undefined },
    select: { id: true, email: true, name: true },
  });

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  await session.save();

  return user;
}

export async function signOut() {
  const session = await getSession();
  session.destroy();
}
