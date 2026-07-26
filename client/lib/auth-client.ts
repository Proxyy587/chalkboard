import { createAuthClient } from "better-auth/react";

/**
 * Same-origin auth client — avoids Failed to fetch when NEXT_PUBLIC_APP_URL
 * points at production while developing on localhost (or vice versa).
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
