import { NextResponse } from "next/server";

import { unauthorized } from "@/lib/api/schemas";
import { requireCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

/**
 * Authenticated customer portal — never accept a client-supplied customer_id.
 * Opens Dodo portal for the signed-in user's stored customer.
 */
export async function GET() {
  let user;
  try {
    user = await requireCurrentUser();
  } catch {
    return unauthorized("Sign in to manage your subscription");
  }

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { dodoCustomerId: true },
  });

  if (!row?.dodoCustomerId) {
    return NextResponse.json(
      {
        error:
          "No billing customer yet. Upgrade on Pricing first, then manage subscription here.",
      },
      { status: 400 }
    );
  }

  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Payments not configured" },
      { status: 503 }
    );
  }

  const env = process.env.DODO_PAYMENTS_ENVIRONMENT?.trim() || "test_mode";
  const base =
    env === "live_mode"
      ? "https://live.dodopayments.com"
      : "https://test.dodopayments.com";

  // Dodo customer portal link — redirect browser, keep settings shell by opening in new tab from UI.
  try {
    const res = await fetch(
      `${base}/customers/${encodeURIComponent(row.dodoCustomerId)}/customer-portal/session`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const msg =
        (typeof data.message === "string" && data.message) ||
        (typeof data.error === "string" && data.error) ||
        "Portal unavailable";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    const link =
      (typeof data.link === "string" && data.link) ||
      (typeof data.portal_url === "string" && data.portal_url) ||
      null;
    if (!link) {
      return NextResponse.json(
        { error: "No portal URL returned" },
        { status: 502 }
      );
    }
    return NextResponse.redirect(link);
  } catch {
    return NextResponse.json(
      { error: "Could not reach payment provider" },
      { status: 502 }
    );
  }
}
