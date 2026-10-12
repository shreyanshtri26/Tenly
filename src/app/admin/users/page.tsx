import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdminPage } from "@/lib/session";

export const metadata = { title: "Super admin · Users" };

export default async function AdminUsersPage() {
  await connection();
  await requireSuperAdminPage();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { memberships: { include: { org: { select: { name: true, slug: true } } } } },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">{users.length} accounts</p>

      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Organizations</th>
              <th className="px-3 py-2 font-medium">Super admin</th>
              <th className="px-3 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {u.memberships.length === 0
                    ? "none"
                    : u.memberships.map((m) => `${m.org.name} (${m.role.toLowerCase()})`).join(", ")}
                </td>
                <td className="px-3 py-2">{u.isSuperAdmin ? "yes" : "no"}</td>
                <td className="whitespace-nowrap px-3 py-2">{u.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
