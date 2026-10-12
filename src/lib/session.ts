import "server-only";
import { cache } from "react";
import type { Plan, Role } from "@/generated/prisma/enums";
import { notFound, redirect } from "next/navigation";
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

// Neon Auth owns the login. Tenly keeps its own User row (same id) so that
// memberships and other tenant data can reference it with real foreign keys.
// Cached per request: the header, the page and its helpers share one session lookup.
export const getSessionUser = cache(async () => {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) return null;
  // Several requests can arrive at once for a new user. createMany with
  // skipDuplicates is race-safe, unlike upsert, which can fail on the unique id.
  const known = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
  if (!known) {
    await prisma.user.createMany({
      data: {
        id: user.id,
        name: user.name ?? user.email,
        email: user.email,
        emailVerified: user.emailVerified ?? false,
        image: user.image ?? null,
      },
      skipDuplicates: true,
    });
  }
  return user;
});

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

/** For pages under /orgs/[slug]: redirects to sign-in or 404s instead of throwing. */
export async function requireOrgPage(slug: string): Promise<OrgContext> {
  try {
    return await requireOrgContext(slug);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect(`/sign-in?next=${encodeURIComponent(`/orgs/${slug}`)}`);
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

/**
 * For /admin pages: only super admins get in. Everyone else gets a 404, so the
 * admin area does not reveal that it exists.
 */
export async function requireSuperAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent("/admin")}`);
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { isSuperAdmin: true } });
  if (!row?.isSuperAdmin) notFound();
  return user;
}
