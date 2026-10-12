import { connection } from "next/server";
import { OrgNav } from "@/components/org-nav";
import { requireOrgPage } from "@/lib/session";
import { Chat } from "./chat";

export const metadata = { title: "Ask Tenly" };

export default async function AssistantPage({ params }: { params: Promise<{ slug: string }> }) {
  // Read the request before touching cookies, so the build does not prerender this page.
  await connection();
  const { slug } = await params;
  const ctx = await requireOrgPage(slug);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Ask Tenly</h1>
      <OrgNav slug={slug} />
      <p className="mt-4 text-sm text-muted-foreground">
        Ask about projects, members or usage. It uses the same tools as the MCP server, with your role&apos;s
        permissions.
      </p>
      <Chat slug={slug} orgName={ctx.orgName} />
    </main>
  );
}
