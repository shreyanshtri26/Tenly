import { Suspense } from "react";
import { CardSkeleton } from "@/components/skeleton";

// The sign-in page reads the session, so it streams in behind this boundary.
export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<CardSkeleton />}>{children}</Suspense>;
}
