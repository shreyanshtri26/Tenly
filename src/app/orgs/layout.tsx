import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeleton";

// Every page under /orgs reads the signed-in user and the organization from the
// request, so it streams in behind this boundary (required with Cache Components).
export default function OrgsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}
