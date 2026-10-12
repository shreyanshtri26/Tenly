"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

function ResetForm() {
  const token = useSearchParams().get("token");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <CardDescription className="mt-2">
        This link is incomplete or has expired. <Link href="/forgot-password" className="underline">Request a new one</Link>.
      </CardDescription>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const newPassword = String(new FormData(event.currentTarget).get("password") ?? "");
    const result = await authClient.resetPassword({ newPassword, token: token! });
    setPending(false);
    if (result.error) return setError(result.error.message ?? "This link has expired. Request a new one.");
    setDone(true);
  }

  if (done) {
    return (
      <>
        <CardDescription className="mt-2">Your password is updated. You can sign in now.</CardDescription>
        <Link href="/sign-in" className="mt-4 inline-block text-sm font-medium underline">
          Go to sign in
        </Link>
      </>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <Input name="password" type="password" placeholder="New password (8+ characters)" minLength={8} required autoComplete="new-password" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <Card>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <Suspense fallback={<CardDescription className="mt-2">Loading…</CardDescription>}>
          <ResetForm />
        </Suspense>
      </Card>
    </main>
  );
}
