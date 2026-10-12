"use client";

import { SubmitButton } from "@/components/submit-button";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Where to go after signing in: the ?next= path if it is one of ours, else the dashboard.
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function SignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    // Loaded on submit, so the page itself stays light.
    const { signIn, signUp } = await import("@/lib/auth-client");
    const result =
      mode === "sign-in"
        ? await signIn.email({ email, password })
        : await signUp.email({ email, password, name: String(form.get("name") || email.split("@")[0]) });

    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Something went wrong");
      return;
    }
    router.push(nextPath());
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <Card>
        <CardTitle className="text-xl">{mode === "sign-in" ? "Sign in to Tenly" : "Create your account"}</CardTitle>
        <CardDescription className="mt-1">Use email and password, or continue with Google.</CardDescription>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          {mode === "sign-up" && <Input name="name" placeholder="Your name" autoComplete="name" />}
          <Input name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
          <Input
            name="password"
            type="password"
            placeholder="Password (8+ characters)"
            minLength={8}
            required
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <SubmitButton className="w-full" disabled={pending}>
            {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
          </SubmitButton>
        </form>

        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={async () => {
            const { signIn } = await import("@/lib/auth-client");
            await signIn.social({ provider: "google", callbackURL: nextPath() });
          }}
        >
          Continue with Google
        </Button>

        <p className="mt-4 text-center text-sm">
          <a href="/forgot-password" className="text-muted-foreground hover:text-foreground">
            Forgot password?
          </a>
        </p>

        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </Card>
    </main>
  );
}
