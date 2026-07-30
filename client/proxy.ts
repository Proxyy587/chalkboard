import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Canonical host: apex manimotion.dev (avoid www/apex cookie split).
 */
export function proxy(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host === "www.manimotion.dev") {
    const url = req.nextUrl.clone();
    url.host = "manimotion.dev";
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
