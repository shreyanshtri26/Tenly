import "server-only";
import type { Plan } from "@/generated/prisma/enums";
import { LimitExceededError } from "@/lib/errors";
import { limitFor, type Metric } from "@/lib/plans";
import type { TenantDb } from "@/lib/tenant";

// Usage metering.
//
// Two kinds of metric:
//  - "Stock" metrics (projects, members) are counted from the real rows, so
//    they can never drift from reality.
//  - "Flow" metrics (assistant_messages) are counted per day in UsageCounter
//    with an atomic upsert-increment.

export function startOfDayUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function currentUsage(db: TenantDb, metric: Metric): Promise<number> {
  switch (metric) {
    case "projects":
      return db.project.count();
    case "members":
      return db.membership.count();
    case "assistant_messages": {
      const row = await db.usageCounter.findFirst({
        where: { metric, periodStart: startOfDayUtc() },
      });
      return row?.count ?? 0;
    }
  }
}

/** Throws LimitExceededError when the org is at its hard limit for `metric`. */
export async function assertWithinLimit(db: TenantDb, plan: Plan, metric: Metric): Promise<void> {
  const limit = limitFor(plan, metric);
  if (!Number.isFinite(limit)) return;
  const used = await currentUsage(db, metric);
  if (used >= limit) {
    throw new LimitExceededError(
      `Your plan allows ${limit} ${metric.replace("_", " ")}. Upgrade to add more.`,
    );
  }
}

/** Atomically increments a per-day flow metric. */
export async function incrementDaily(db: TenantDb, orgId: string, metric: Metric): Promise<void> {
  const periodStart = startOfDayUtc();
  await db.usageCounter.upsert({
    where: { orgId_metric_periodStart: { orgId, metric, periodStart } },
    create: { orgId, metric, periodStart, count: 1 },
    update: { count: { increment: 1 } },
  });
}
