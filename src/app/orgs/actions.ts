"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { recordAudit } from "@/lib/audit";
import { generateApiKey, sha256 } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError, BadRequestError, ForbiddenError } from "@/lib/errors";
import { limitFor } from "@/lib/plans";
import { cancelAtPeriodEnd, createHostedSubscription } from "@/lib/razorpay";
import { assertCan, canAssignRole, memberChangeError } from "@/lib/rbac";
import { requireOrgContext, requireUser } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { createProject, inviteMember } from "@/lib/tools";

// Server actions for the web UI. Business rules live in lib/tools.ts and
// lib/rbac.ts, so these functions only read the form, call the rule and
// record the result. Form actions report errors by redirecting back with
// ?error=...; actions called from client components return { error }.

function text(form: FormData, key: string): string {
  const value = form.get(key);
  if (typeof value !== "string") throw new BadRequestError(`Missing field: ${key}`);
  return value;
}

function messageFor(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof ZodError) return error.issues[0]?.message ?? "Invalid input";
  throw error;
}

/** Runs a form action; on a known error, sends the user back with the message. */
async function attempt(path: string, work: () => Promise<unknown>) {
  try {
    await work();
  } catch (error) {
    redirect(`${path}?error=${encodeURIComponent(messageFor(error))}`);
  }
  revalidatePath(path);
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

// Prisma's default is 5s, which a cold Neon compute can exceed. ponytail: raise again if commits still expire.
const TX_OPTIONS = { timeout: 15_000 };

export async function createOrgAction(form: FormData) {
  const user = await requireUser();
  const name = text(form, "name").trim();
  if (name.length < 2 || name.length > 80) redirect("/orgs/new?error=Name must be 2 to 80 characters");

  const slug = slugify(name);
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name, slug } });
    await tx.membership.create({ data: { orgId: org.id, userId: user.id, role: "OWNER" } });
    await tx.auditLog.create({
      data: { orgId: org.id, actorUserId: user.id, action: "org.created", targetType: "organization", targetId: org.id },
    });
  }, TX_OPTIONS);
  redirect(`/orgs/${slug}`);
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function createProjectAction(slug: string, form: FormData) {
  await attempt(`/orgs/${slug}`, async () => {
    const ctx = await requireOrgContext(slug);
    await createProject.execute(ctx, {
      name: text(form, "name"),
      description: text(form, "description") || undefined,
    });
  });
}

export async function deleteProjectAction(slug: string, form: FormData) {
  await attempt(`/orgs/${slug}`, async () => {
    const ctx = await requireOrgContext(slug);
    assertCan(ctx.role, "project:delete");
    const id = text(form, "id");
    const removed = await ctx.db.project.deleteMany({ where: { id } });
    if (removed.count === 0) throw new BadRequestError("Project not found");
    await recordAudit(ctx.db, {
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "project.deleted",
      targetType: "project",
      targetId: id,
    });
  });
}

// ---------------------------------------------------------------------------
// Members and invites
// ---------------------------------------------------------------------------

export async function inviteMemberAction(slug: string, form: FormData) {
  await attempt(`/orgs/${slug}/members`, async () => {
    const ctx = await requireOrgContext(slug);
    await inviteMember.execute(ctx, { email: text(form, "email"), role: text(form, "role") });
  });
}

export async function changeRoleAction(slug: string, form: FormData) {
  await attempt(`/orgs/${slug}/members`, async () => {
    const ctx = await requireOrgContext(slug);
    assertCan(ctx.role, "member:change_role");
    const id = text(form, "membershipId");
    const newRole = text(form, "role") as "OWNER" | "ADMIN" | "MEMBER";

    const target = await ctx.db.membership.findFirst({ where: { id }, select: { userId: true, role: true } });
    if (!target) throw new BadRequestError("Member not found");
    const ownerCount = await ctx.db.membership.count({ where: { role: "OWNER" } });

    const problem = memberChangeError({ actorId: ctx.userId, actorRole: ctx.role, target, newRole, ownerCount });
    if (problem) throw new ForbiddenError(problem);

    await ctx.db.membership.updateMany({ where: { id }, data: { role: newRole } });
    await recordAudit(ctx.db, {
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "member.role_changed",
      targetType: "membership",
      targetId: id,
      metadata: { from: target.role, to: newRole },
    });
  });
}

export async function removeMemberAction(slug: string, form: FormData) {
  await attempt(`/orgs/${slug}/members`, async () => {
    const ctx = await requireOrgContext(slug);
    assertCan(ctx.role, "member:remove");
    const id = text(form, "membershipId");

    const target = await ctx.db.membership.findFirst({ where: { id }, select: { userId: true, role: true } });
    if (!target) throw new BadRequestError("Member not found");
    const ownerCount = await ctx.db.membership.count({ where: { role: "OWNER" } });

    const problem = memberChangeError({ actorId: ctx.userId, actorRole: ctx.role, target, ownerCount });
    if (problem) throw new ForbiddenError(problem);

    await ctx.db.membership.deleteMany({ where: { id } });
    await recordAudit(ctx.db, {
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "member.removed",
      targetType: "membership",
      targetId: id,
      metadata: { role: target.role },
    });
  });
}

export async function revokeInviteAction(slug: string, form: FormData) {
  await attempt(`/orgs/${slug}/members`, async () => {
    const ctx = await requireOrgContext(slug);
    assertCan(ctx.role, "member:invite");
    await ctx.db.invite.deleteMany({ where: { id: text(form, "inviteId"), acceptedAt: null } });
  });
}

/** Joins the signed-in user to the org named in an invite, if the invite is valid for them. */
export async function acceptInviteAction(token: string) {
  const user = await requireUser();
  const invite = await prisma.invite.findUnique({ where: { tokenHash: sha256(token) }, include: { org: true } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    redirect(`/invite/${token}?error=This invite is no longer valid`);
  }
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    redirect(`/invite/${token}?error=This invite was sent to a different email address`);
  }

  const memberCount = await prisma.membership.count({ where: { orgId: invite.orgId } });
  if (memberCount >= limitFor(invite.org.plan, "members")) {
    redirect(`/invite/${token}?error=This organization has reached its member limit`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: { orgId_userId: { orgId: invite.orgId, userId: user.id } },
      create: { orgId: invite.orgId, userId: user.id, role: invite.role },
      update: {},
    });
    await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    await tx.auditLog.create({
      data: {
        orgId: invite.orgId,
        actorUserId: user.id,
        action: "member.joined",
        targetType: "invite",
        targetId: invite.id,
        metadata: { role: invite.role },
      },
    });
  }, TX_OPTIONS);
  redirect(`/orgs/${invite.org.slug}`);
}

// ---------------------------------------------------------------------------
// API keys (used by MCP clients)
// ---------------------------------------------------------------------------

/** Returns the full key once. Only its hash is stored. */
export async function createApiKeyAction(
  slug: string,
  input: { name: string; role: "ADMIN" | "MEMBER" },
): Promise<{ key: string } | { error: string }> {
  try {
    const ctx = await requireOrgContext(slug);
    assertCan(ctx.role, "apikey:manage");
    const name = input.name.trim();
    if (name.length < 1 || name.length > 60) throw new BadRequestError("Name must be 1 to 60 characters");
    if (!canAssignRole(ctx.role, input.role)) throw new ForbiddenError("You cannot create a key above your own role");

    const { key, prefix, hash } = generateApiKey();
    const created = await ctx.db.apiKey.create({
      data: { orgId: ctx.orgId, name, prefix, keyHash: hash, role: input.role, createdById: ctx.userId },
    });
    await recordAudit(ctx.db, {
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "apikey.created",
      targetType: "api_key",
      targetId: created.id,
      metadata: { name, role: input.role },
    });
    revalidatePath(`/orgs/${slug}/keys`);
    return { key };
  } catch (error) {
    return { error: messageFor(error) };
  }
}

export async function revokeApiKeyAction(slug: string, form: FormData) {
  await attempt(`/orgs/${slug}/keys`, async () => {
    const ctx = await requireOrgContext(slug);
    assertCan(ctx.role, "apikey:manage");
    const id = text(form, "id");
    const result = await ctx.db.apiKey.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (result.count === 0) throw new BadRequestError("Key not found or already revoked");
    await recordAudit(ctx.db, {
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "apikey.revoked",
      targetType: "api_key",
      targetId: id,
    });
  });
}

// ---------------------------------------------------------------------------
// Billing (Razorpay test mode)
// ---------------------------------------------------------------------------

export async function startCheckoutAction(slug: string, form: FormData) {
  const path = `/orgs/${slug}/billing`;
  let payUrl: string;
  try {
    const ctx = await requireOrgContext(slug);
    assertCan(ctx.role, "billing:manage");
    const plan = text(form, "plan");
    const planId = plan === "PRO" ? env.RAZORPAY_PLAN_ID_PRO : plan === "TEAM" ? env.RAZORPAY_PLAN_ID_TEAM : undefined;
    if (!planId) throw new BadRequestError("That plan is not available");

    const current = await ctx.db.subscription.findFirst({ where: { status: "ACTIVE" } });
    if (current && !current.cancelAtPeriodEnd) {
      throw new ForbiddenError("Cancel your current plan before switching");
    }
    payUrl = (await createHostedSubscription({ planId, orgId: ctx.orgId })).url;
  } catch (error) {
    redirect(`${path}?error=${encodeURIComponent(messageFor(error))}`);
  }
  // Razorpay's hosted page takes the payment. The webhook applies the plan.
  redirect(payUrl);
}

export async function cancelSubscriptionAction(slug: string) {
  await attempt(`/orgs/${slug}/billing`, async () => {
    const ctx = await requireOrgContext(slug);
    assertCan(ctx.role, "billing:manage");
    const sub = await ctx.db.subscription.findFirst({ where: { status: "ACTIVE" } });
    if (!sub?.razorpaySubscriptionId) throw new BadRequestError("No active subscription to cancel");
    await cancelAtPeriodEnd(sub.razorpaySubscriptionId);
    await ctx.db.subscription.updateMany({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true } });
  });
}
