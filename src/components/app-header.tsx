import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";
import { getSessionUser, isSuperAdminUser } from "@/lib/session";

// Shown on every page. Sticky, so the navigation stays in reach while scrolling.
// Reads the session only (no writes).
export async function AppHeader() {
  const user = await getSessionUser();
  const superAdmin = user ? await isSuperAdminUser(user.id) : false;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-2.5 font-semibold tracking-tight">
          <BrandMark className="size-7 transition-transform group-hover:scale-105" />
          Tenly
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          <NavLink href="/features">Features</NavLink>
          {user && <NavLink href="/dashboard">Dashboard</NavLink>}
          {superAdmin && <NavLink href="/admin">Admin</NavLink>}
          {user ? (
            <>
              <span aria-hidden className="mx-2 hidden h-4 w-px bg-border sm:inline-block" />
              <span className="hidden max-w-40 truncate px-2 text-muted-foreground md:inline">{user.name}</span>
              <SignOutButton />
            </>
          ) : (
            <NavLink href="/sign-in">Sign in</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
