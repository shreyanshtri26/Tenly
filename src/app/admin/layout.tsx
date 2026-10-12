import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeleton";

// Read-only operator console for super admins. Every page here reads the
// request, so it streams in behind this boundary (required with Cache Components).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-3 text-sm">
          <span className="mr-3 font-semibold">Super admin</span>
          <Link href="/admin" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
            Organizations
          </Link>
          <Link href="/admin/users" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
            Users
          </Link>
          <Link href="/dashboard" className="ml-auto rounded-md px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
            Dashboard
          </Link>
        </div>
      </nav>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </div>
  );
}
