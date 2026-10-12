import { Suspense } from "react";

// The sign-in page reads the session, so it streams in behind this boundary.
export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Loading…</p>}>{children}</Suspense>;
}
