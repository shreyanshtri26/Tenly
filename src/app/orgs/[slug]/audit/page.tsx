import { connection } from "next/server";
import { OrgNav } from "@/components/org-nav";
import { requireOrgPage } from "@/lib/session";
import { can } from "@/lib/rbac";

export const metadata = { title: "Audit log" };

export default async function AuditPage({ params }: { params: Promise<{ slug: string }> }) {
  // Read the request before touching cookies, so the build does not prerender this page.
  await connection();
  const { slug } = await params;
  const ctx = await requireOrgPage(slug);
  if (!can(ctx.role, "audit:read")) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <OrgNav slug={slug} role={ctx.role} />
        <p className="mt-6 text-sm text-muted-foreground">Your role ({ctx.role.toLowerCase()}) cannot view this page.</p>
      </main>
    );
  }

  const entries = await ctx.db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
      <OrgNav slug={slug} role={ctx.role} />
      <p className="mt-4 text-sm text-muted-foreground">The 100 most recent changes in this organization.</p>
      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Target</th>
              <th className="px-3 py-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="whitespace-nowrap px-3 py-2">{entry.createdAt.toLocaleString()}</td>
                <td className="px-3 py-2 font-mono text-xs">{entry.action}</td>
                <td className="px-3 py-2 text-muted-foreground">{entry.targetType ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {entry.metadata ? JSON.stringify(entry.metadata) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
