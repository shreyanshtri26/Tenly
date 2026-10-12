import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { TenantDb } from "@/lib/tenant";

// Audit log of sensitive actions. Call it inside the same transaction as the
// change it describes, so an action and its log entry succeed or fail together.

export const AUDIT_ACTIONS = [
  "org.created",
  "member.invited",
  "member.joined",
  "member.removed",
  "member.role_changed",
  "project.created",
  "project.deleted",
  "plan.changed",
  "apikey.created",
  "apikey.revoked",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export async function recordAudit(
  db: TenantDb,
  entry: {
    orgId: string;
    actorUserId: string | null;
    action: AuditAction;
    targetType?: string;
    targetId?: string;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await db.auditLog.create({ data: entry });
}
