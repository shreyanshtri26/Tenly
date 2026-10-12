"use client";

import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    const result = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` });
    setPending(false);
    if (result.error) return setError(result.error.message ?? "Could not send the email. Try again.");
    setSent(true);
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <Card>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        {sent ? (
          <CardDescription className="mt-2">
            If an account exists for that address, a reset link is on its way. Check your inbox.
          </CardDescription>
        ) : (
          <>
            <CardDescription className="mt-1">We will email you a link to choose a new password.</CardDescription>
            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <Input name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <SubmitButton className="w-full" disabled={pending}>
                {pending ? "Sending…" : "Send reset link"}
              </SubmitButton>
            </form>
          </>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href="/sign-in" className="text-muted-foreground hover:text-foreground">
            Back to sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
