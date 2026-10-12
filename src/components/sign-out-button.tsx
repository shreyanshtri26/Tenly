"use client";

import { useState } from "react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className="rounded-md border px-3 py-1 text-sm hover:bg-secondary disabled:opacity-50"
      onClick={async () => {
        setPending(true);
        await signOut();
        window.location.href = "/";
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
