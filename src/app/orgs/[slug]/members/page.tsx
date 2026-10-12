import { SubmitButton } from "@/components/submit-button";
import { connection } from "next/server";
import { ErrorNotice, OrgNav, selectClassName } from "@/components/org-nav";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { canAssignRole, can, type Permission } from "@/lib/rbac";
import { requireOrgPage } from "@/lib/session";
import { changeRoleAction, inviteMemberAction, removeMemberAction, revokeInviteAction } from "../../actions";
import type { Role } from "@/generated/prisma/enums";

export const metadata = { title: "Members" };

const ROLES: Role[] = ["OWNER", "ADMIN", "MEMBER"];

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  // Read the request before touching cookies, so the build does not prerender this page.
  await connection();
  const { slug } = await params;
  const { error } = await searchParams;
  const ctx = await requireOrgPage(slug);

  const [members, invites] = await Promise.all([
    ctx.db.membership.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, userId: true, user: { select: { name: true, email: true } } },
    }),
    ctx.db.invite.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, expiresAt: true },
    }),
  ]);

  // You can only hand out roles at or below your own.
  const assignable = ROLES.filter((role) => canAssignRole(ctx.role, role));
  const allowed = (permission: Permission) => can(ctx.role, permission);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
      <OrgNav slug={slug} />
      <ErrorNotice message={error} />

      <section className="mt-8">
        <h2 className="text-lg font-semibold">People</h2>
        <ul className="mt-3 divide-y rounded-md border">
          {members.map((member) => {
            const isYou = member.userId === ctx.userId;
            const canEdit = !isYou && allowed("member:change_role") && canAssignRole(ctx.role, member.role);
            const canRemove = !isYou && allowed("member:remove") && canAssignRole(ctx.role, member.role);
            return (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">
                    {member.user.name} {isYou && <span className="text-xs text-muted-foreground">(you)</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit ? (
                    <form action={changeRoleAction.bind(null, slug)} className="flex items-center gap-2">
                      <input type="hidden" name="membershipId" value={member.id} />
                      <select name="role" defaultValue={member.role} className={selectClassName}>
                        {assignable.map((role) => (
                          <option key={role} value={role}>
                            {role.toLowerCase()}
                          </option>
                        ))}
                      </select>
                      <SubmitButton variant="outline" size="sm">
                        Save
                      </SubmitButton>
                    </form>
                  ) : (
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs">{member.role.toLowerCase()}</span>
                  )}
                  {canRemove && (
                    <form action={removeMemberAction.bind(null, slug)}>
                      <input type="hidden" name="membershipId" value={member.id} />
                      <SubmitButton variant="ghost" size="sm" className="text-destructive">
                        Remove
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {allowed("member:invite") && (
        <section className="mt-10 grid gap-8 lg:grid-cols-2">
          <Card>
            <CardTitle className="text-base">Invite someone</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">They get a link by email. It expires in 7 days.</p>
            <form action={inviteMemberAction.bind(null, slug)} className="mt-4 space-y-3">
              <Input name="email" type="email" placeholder="teammate@example.com" required />
              <select name="role" defaultValue="MEMBER" className={selectClassName + " w-full"}>
                {assignable
                  .filter((role) => role !== "OWNER")
                  .map((role) => (
                    <option key={role} value={role}>
                      {role.toLowerCase()}
                    </option>
                  ))}
              </select>
              <SubmitButton className="w-full">
                Send invite
              </SubmitButton>
            </form>
          </Card>

          <Card>
            <CardTitle className="text-base">Pending invites</CardTitle>
            {invites.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No pending invites.</p>
            ) : (
              <ul className="mt-3 divide-y">
                {invites.map((invite) => (
                  <li key={invite.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>
                      {invite.email} <span className="text-muted-foreground">as {invite.role.toLowerCase()}</span>
                    </span>
                    <form action={revokeInviteAction.bind(null, slug)}>
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <SubmitButton variant="ghost" size="sm">
                        Revoke
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}
    </main>
  );
}
