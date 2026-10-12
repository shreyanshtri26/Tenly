import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminPage } from "@/lib/session";

export const metadata = { title: "Super admin · Organizations" };

export default async function AdminOrgsPage() {
  await connection();
  await requireSuperAdminPage();

  const [orgs, userCount] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { memberships: true, projects: true, apiKeys: true } } },
    }),
    prisma.user.count(),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">All organizations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {orgs.length} organizations · {userCount} users
      </p>

      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Organization</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Members</th>
              <th className="px-3 py-2 font-medium">Projects</th>
              <th className="px-3 py-2 font-medium">API keys</th>
              <th className="px-3 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orgs.map((org) => (
              <tr key={org.id} className="hover:bg-secondary/40">
                <td className="px-3 py-2">
                  <Link href={`/admin/orgs/${org.slug}`} className="font-medium hover:underline">
                    {org.name}
                  </Link>
                  <div className="font-mono text-xs text-muted-foreground">{org.slug}</div>
                </td>
                <td className="px-3 py-2">{org.plan}</td>
                <td className="px-3 py-2">{org._count.memberships}</td>
                <td className="px-3 py-2">{org._count.projects}</td>
                <td className="px-3 py-2">{org._count.apiKeys}</td>
                <td className="whitespace-nowrap px-3 py-2">{org.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
