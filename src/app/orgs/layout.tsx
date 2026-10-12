import { Suspense } from "react";

// Every page under /orgs reads the signed-in user and the organization from the
// request, so it streams in behind this boundary (required with Cache Components).
export default function OrgsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Loading…</p>}>{children}</Suspense>;
}
