// Pure tenant-scoping rule, kept free of database imports so it can be unit
// tested without a database. `forOrg` in ./tenant.ts applies it to every query.

export const TENANT_MODELS = new Set([
  "Membership",
  "Invite",
  "Project",
  "UsageCounter",
  "AuditLog",
  "ApiKey",
]);

const FILTERED_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
]);

type Args = Record<string, unknown> & {
  where?: Record<string, unknown>;
  data?: unknown;
  create?: Record<string, unknown>;
};

export class TenantViolationError extends Error {}

export function scopeArgs(model: string, operation: string, args: Args, orgId: string): Args {
  if (!TENANT_MODELS.has(model)) return args;
  if (!orgId) throw new TenantViolationError("orgId is required for tenant models");

  if (FILTERED_OPS.has(operation)) {
    return { ...args, where: { ...(args.where ?? {}), orgId } };
  }

  if (operation === "create" || operation === "createManyAndReturn" || operation === "createMany") {
    const withOrg = (row: unknown) => {
      const r = row as Record<string, unknown>;
      if (r.orgId && r.orgId !== orgId) {
        throw new TenantViolationError("Cannot create a row for another organization");
      }
      return { ...r, orgId };
    };
    const data = Array.isArray(args.data) ? args.data.map(withOrg) : withOrg(args.data);
    return { ...args, data };
  }

  if (operation === "upsert") {
    return {
      ...args,
      where: { ...(args.where ?? {}), orgId },
      create: { ...(args.create ?? {}), orgId },
    };
  }

  throw new TenantViolationError(`Operation "${operation}" on ${model} is not tenant-safe`);
}
