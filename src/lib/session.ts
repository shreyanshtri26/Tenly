import "server-only";
import { headers } from "next/headers";
import type { Plan, Role } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";
import { canAssignRole } from "@/lib/rbac";
import { forOrg, type TenantDb } from "@/lib/tenant";

// The single entry point for "who is calling, and in which organization?".
// Every server action, route handler and MCP tool resolves an OrgContext
// first, then passes it down. Business logic never reads cookies itself.

export type OrgContext = {
  userId: string;
  orgId: string;
  orgSlug: string;
  orgName: string;
  plan: Plan;
  role: Role;
  db: TenantDb;
};

export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Resolves the caller's membership in the org identified by `slug`. */
export async function requireOrgContext(slug: string): Promise<OrgContext> {
  const user = await requireUser();
  return orgContextFor(user.id, { slug });
}

export async function orgContextFor(
  userId: string,
  where: { slug: string } | { id: string },
  roleOverride?: Role,
): Promise<OrgContext> {
  const org = await prisma.organization.findUnique({ where });
  if (!org) throw new NotFoundError("Organization not found");

  const membership = await prisma.membership.findUnique({
    where: { orgId_userId: { orgId: org.id, userId } },
  });
  // Respond "not found" rather than "forbidden" so outsiders cannot probe
  // which organization slugs exist.
  if (!membership) throw new NotFoundError("Organization not found");

  return {
    userId,
    orgId: org.id,
    orgSlug: org.slug,
    orgName: org.name,
    plan: org.plan,
    // An API key may carry a lower role than its creator, never a higher one.
    // If the creator was demoted after making the key, the lower role wins.
    role: roleOverride && canAssignRole(membership.role, roleOverride) ? roleOverride : membership.role,
    db: forOrg(org.id),
  };
}

/** Organizations the user belongs to, for the org switcher. */
export async function listUserOrgs(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { org: { select: { id: true, name: true, slug: true, plan: true } } },
    orderBy: { createdAt: "asc" },
  });
}
