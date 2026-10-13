"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Plan } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireSuperAdminPage } from "@/lib/session";

const PLAN_NAMES: Plan[] = ["FREE", "PRO", "TEAM"];

// Super admins can set any organization's plan by hand (for support or a
// comp deal). The change and its audit entry are written in one transaction.
// Note: a later Razorpay webhook for a live subscription can set the plan again.
export async function changePlanAction(slug: string, form: FormData) {
  const admin = await requireSuperAdminPage();
  const plan = String(form.get("plan")) as Plan;
  if (!PLAN_NAMES.includes(plan)) redirect(`/admin/orgs/${slug}`);

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({ where: { slug }, select: { id: true, plan: true } });
    if (!org || org.plan === plan) return;
    await tx.organization.update({ where: { id: org.id }, data: { plan } });
    await tx.auditLog.create({
      data: {
        orgId: org.id,
        actorUserId: admin.id,
        action: "plan.changed",
        targetType: "organization",
        targetId: org.id,
        metadata: { from: org.plan, to: plan, by: "super_admin" },
      },
    });
  });

  revalidatePath(`/admin/orgs/${slug}`);
  redirect(`/admin/orgs/${slug}`);
}
