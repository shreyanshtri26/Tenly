import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { ErrorNotice } from "@/components/org-nav";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { sha256 } from "@/lib/crypto";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { acceptInviteAction } from "@/app/orgs/actions";

export const metadata = { title: "Accept invite" };

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

// The page shell is static; the invite lookup streams in behind <Suspense>.
export default function InvitePage(props: Props) {
  return (
    <Suspense fallback={<Shell><CardDescription>Loading invite…</CardDescription></Shell>}>
      <InviteContent {...props} />
    </Suspense>
  );
}

async function InviteContent({ params, searchParams }: Props) {
  // Read the request before touching cookies, so the build does not prerender this page.
  await connection();
  const { token } = await params;
  const { error } = await searchParams;

  const invite = await prisma.invite.findUnique({
    where: { tokenHash: sha256(token) },
    include: { org: { select: { name: true } } },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return (
      <Shell>
        <CardTitle>This invite is not valid</CardTitle>
        <CardDescription className="mt-2">It may have expired or already been used. Ask for a new one.</CardDescription>
      </Shell>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);

  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <Shell>
        <CardTitle>Wrong account</CardTitle>
        <CardDescription className="mt-2">
          This invite was sent to {invite.email}. You are signed in as {user.email}. Sign out and sign in with the
          invited address.
        </CardDescription>
      </Shell>
    );
  }

  return (
    <Shell>
      <CardTitle>Join {invite.org.name}</CardTitle>
      <CardDescription className="mt-2">You will join as {invite.role.toLowerCase()}.</CardDescription>
      <ErrorNotice message={error} />
      <form action={acceptInviteAction.bind(null, token)} className="mt-6">
        <SubmitButton className="w-full">
          Accept invite
        </SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          Not now
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <Card>{children}</Card>
    </main>
  );
}
