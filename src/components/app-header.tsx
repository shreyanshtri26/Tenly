import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

// Shown on every page. Reads the session only (no database writes).
export async function AppHeader() {
  const { data } = await auth.getSession();
  const user = data?.user;

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Tenly
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
              <span className="hidden text-muted-foreground sm:inline">{user.name}</span>
              <SignOutButton />
            </>
          ) : (
            <Link href="/sign-in" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
