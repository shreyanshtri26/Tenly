import { auth } from "@/lib/auth";

// Runs before pages under the matcher below. It also finishes the Google (OAuth)
// sign-in: when the provider sends the user back with a session verifier, this
// exchanges it for the session cookie. Without this file the verifier is never
// exchanged, and the user lands on /sign-in after signing in with Google.
export default auth.middleware({ loginUrl: "/sign-in" });

export const config = {
  matcher: ["/dashboard/:path*", "/orgs/:path*", "/admin/:path*"],
};
