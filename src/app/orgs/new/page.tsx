import { SubmitButton } from "@/components/submit-button";
import { connection } from "next/server";
import { ErrorNotice } from "@/components/org-nav";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/session";
import { createOrgAction } from "../actions";

export const metadata = { title: "Create organization" };

export default async function NewOrgPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // Read the request before touching cookies, so the build does not prerender this page.
  await connection();
  await requireUser();
  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <Card>
        <CardTitle className="text-xl">Create an organization</CardTitle>
        <CardDescription className="mt-1">You become its owner. The Free plan is active right away.</CardDescription>
        <ErrorNotice message={error} />
        <form action={createOrgAction} className="mt-6 space-y-3">
          <Input name="name" placeholder="Organization name" required minLength={2} maxLength={80} />
          <SubmitButton className="w-full">
            Create organization
          </SubmitButton>
        </form>
      </Card>
    </main>
  );
}
