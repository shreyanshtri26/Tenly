import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Runs before the pages in the matcher below. Its main job is to finish the
// Google (OAuth) sign-in: when the provider sends the user back with a session
// verifier, this exchanges it for the session cookie. Without it the user lands
// signed out after Google login.
const guard = auth.middleware({ loginUrl: "/sign-in" });
const VERIFIER_PARAM = "neon_auth_session_verifier";

export default function proxy(request: NextRequest) {
  const url = request.nextUrl;
  // The home page is public. Only a Google return to "/" needs the exchange.
  if (url.pathname === "/" && !url.searchParams.has(VERIFIER_PARAM)) {
    return NextResponse.next();
  }
  return guard(request);
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/orgs/:path*", "/admin/:path*"],
};
