import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PLANS } from "@/lib/plans";
import { getSessionUser, listUserOrgs } from "@/lib/session";

export const metadata = { title: "Dashboard" };

// The page shell is static; the part that reads the session streams in
// behind <Suspense> (required with Cache Components enabled).
export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Your organizations</h1>
      <Suspense fallback={<p className="mt-6 text-muted-foreground">Loading…</p>}>
        <OrgList />
      </Suspense>
    </main>
  );
}

async function OrgList() {
  // Wait for a real request before reading cookies, so the build does not prerender this part.
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const memberships = await listUserOrgs(user.id);

  if (memberships.length === 0) {
    return (
      <Card className="mt-6">
        <CardTitle>No organizations yet</CardTitle>
        <CardDescription className="mt-2">Create one, or accept an invite from a teammate.</CardDescription>
        <Link
          href="/orgs/new"
          className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create organization
        </Link>
      </Card>
    );
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {memberships.map(({ org, role }) => (
        <Link key={org.id} href={`/orgs/${org.slug}`} className="block">
          <Card className="h-full transition-colors hover:bg-secondary/50">
            <CardTitle>{org.name}</CardTitle>
            <CardDescription className="mt-2">
              {PLANS[org.plan].name} plan · You are {role.toLowerCase()}
            </CardDescription>
          </Card>
        </Link>
      ))}
    </div>
  );
}
