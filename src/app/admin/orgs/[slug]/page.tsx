import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminPage } from "@/lib/session";
import { changePlanAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { selectClassName } from "@/components/org-nav";
import { PLANS } from "@/lib/plans";

export const metadata = { title: "Super admin · Organization" };

// Read-only view of one organization across all of its data. Uses the
// platform client on purpose: super admins are not tenant-scoped.
export default async function AdminOrgDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  await requireSuperAdminPage();
  const { slug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      subscription: true,
      memberships: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true, email: true } } } },
      invites: { where: { acceptedAt: null }, orderBy: { createdAt: "desc" } },
      projects: { orderBy: { createdAt: "desc" }, take: 100 },
      apiKeys: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!org) notFound();

  const audit = await prisma.auditLog.findMany({ where: { orgId: org.id }, orderBy: { createdAt: "desc" }, take: 200 });
  const actorIds = [...new Set(audit.map((a) => a.actorUserId).filter((id): id is string => !!id))];
  const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, email: true } });
  const emailOf = new Map(actors.map((u) => [u.id, u.email]));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10">
      <div>
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← All organizations
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{org.name}</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{org.slug}</p>
        <form action={changePlanAction.bind(null, org.slug)} className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="plan" className="text-muted-foreground">
            Plan
          </label>
          <select id="plan" name="plan" defaultValue={org.plan} className={selectClassName}>
            {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((p) => (
              <option key={p} value={p}>
                {PLANS[p].name}
              </option>
            ))}
          </select>
          <SubmitButton pendingText="Saving…" className="h-9 rounded-md border px-3 text-sm hover:bg-secondary">
            Change plan
          </SubmitButton>
        </form>
        <p className="mt-3 text-sm">
          Plan <strong>{org.plan}</strong>
          {org.subscription && (
            <>
              {" "}· subscription {org.subscription.status}
              {org.subscription.razorpaySubscriptionId && ` (${org.subscription.razorpaySubscriptionId})`}
              {org.subscription.cancelAtPeriodEnd && " · cancels at period end"}
            </>
          )}
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Members ({org.memberships.length})</h2>
        <ul className="mt-3 divide-y rounded-md border">
          {org.memberships.map((m) => (
            <li key={m.id} className="flex justify-between px-4 py-2 text-sm">
              <span>
                {m.user.name} <span className="text-muted-foreground">{m.user.email}</span>
              </span>
              <span className="text-muted-foreground">{m.role.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Pending invites ({org.invites.length})</h2>
        {org.invites.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None.</p>
        ) : (
          <ul className="mt-3 divide-y rounded-md border">
            {org.invites.map((i) => (
              <li key={i.id} className="flex justify-between px-4 py-2 text-sm">
                <span>{i.email}</span>
                <span className="text-muted-foreground">
                  {i.role.toLowerCase()} · expires {i.expiresAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Projects ({org.projects.length})</h2>
        {org.projects.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None.</p>
        ) : (
          <ul className="mt-3 divide-y rounded-md border">
            {org.projects.map((p) => (
              <li key={p.id} className="px-4 py-2 text-sm">
                <span className="font-medium">{p.name}</span>
                {p.description && <span className="text-muted-foreground"> · {p.description}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">API keys ({org.apiKeys.length})</h2>
        <p className="mt-1 text-xs text-muted-foreground">Only prefixes are shown. Secrets are stored as hashes.</p>
        {org.apiKeys.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None.</p>
        ) : (
          <ul className="mt-3 divide-y rounded-md border">
            {org.apiKeys.map((k) => (
              <li key={k.id} className="flex flex-wrap justify-between gap-2 px-4 py-2 text-sm">
                <span>
                  {k.name} <span className="font-mono text-xs text-muted-foreground">tnly_{k.prefix}_…</span>
                </span>
                <span className="text-muted-foreground">
                  {k.role.toLowerCase()} · {k.revokedAt ? "revoked" : "active"} ·{" "}
                  {k.lastUsedAt ? `last used ${k.lastUsedAt.toLocaleDateString()}` : "never used"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Audit log (latest 200)</h2>
        <div className="mt-3 overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Target</th>
                <th className="px-3 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap px-3 py-2">{a.createdAt.toLocaleString()}</td>
                  <td className="px-3 py-2">{a.actorUserId ? (emailOf.get(a.actorUserId) ?? a.actorUserId) : "system"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{a.action}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.targetType ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {a.metadata ? JSON.stringify(a.metadata) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
