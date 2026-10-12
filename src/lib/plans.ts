import type { Plan } from "@/generated/prisma/enums";

// Everything a plan unlocks is defined here, once. Feature checks and usage
// limits read from this config instead of hard-coding plan names in the UI.

export type Metric = "projects" | "members" | "assistant_messages";

export type PlanConfig = {
  name: string;
  pricePerMonthInPaise: number;
  limits: Record<Metric, number>; // Infinity means unlimited
  features: {
    mcpAccess: boolean;
    auditLog: boolean;
  };
};

export const PLANS: Record<Plan, PlanConfig> = {
  FREE: {
    name: "Free",
    pricePerMonthInPaise: 0,
    limits: { projects: 3, members: 3, assistant_messages: 20 },
    features: { mcpAccess: false, auditLog: false },
  },
  PRO: {
    name: "Pro",
    pricePerMonthInPaise: 49_900,
    limits: { projects: 25, members: 10, assistant_messages: 200 },
    features: { mcpAccess: true, auditLog: true },
  },
  TEAM: {
    name: "Team",
    pricePerMonthInPaise: 149_900,
    limits: { projects: Infinity, members: 50, assistant_messages: 1_000 },
    features: { mcpAccess: true, auditLog: true },
  },
};

export function limitFor(plan: Plan, metric: Metric): number {
  return PLANS[plan].limits[metric];
}

export function hasFeature(plan: Plan, feature: keyof PlanConfig["features"]): boolean {
  return PLANS[plan].features[feature];
}

// Soft limit: warn the user at 80% so the hard limit is never a surprise.
export const SOFT_LIMIT_RATIO = 0.8;

export function usageState(used: number, limit: number): "ok" | "soft" | "hard" {
  if (!Number.isFinite(limit)) return "ok";
  if (used >= limit) return "hard";
  if (used >= Math.floor(limit * SOFT_LIMIT_RATIO)) return "soft";
  return "ok";
}
