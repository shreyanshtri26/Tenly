import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in" };

// Only same-site paths. Anything else falls back to the dashboard.
function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

// A signed-in visitor (for example, just back from Google) goes straight on
// to the page they came for, instead of seeing the sign-in form again.
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await connection();
  const { next } = await searchParams;
  const { data } = await auth.getSession();
  if (data?.user) redirect(safeNext(next));
  return <SignInForm />;
}
