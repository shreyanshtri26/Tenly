"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// The auth client is loaded only when the button is pressed, so public pages
// do not download the sign-in code. Refreshing re-reads the header's session.
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-md border px-3 py-1 text-sm hover:bg-secondary disabled:opacity-50"
      onClick={async () => {
        setPending(true);
        const { signOut } = await import("@/lib/auth-client");
        await signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
