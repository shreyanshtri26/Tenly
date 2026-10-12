import "server-only";
import { prisma } from "@/lib/db";
import { scopeArgs } from "@/lib/tenant-scope";

// Row-level tenant isolation.
//
// `forOrg(orgId)` returns a Prisma client that automatically adds
// `orgId` to every read, write and delete on tenant-owned models. Code that
// uses it cannot accidentally read or modify another organization's rows.
// The rule itself lives in ./tenant-scope.ts and is unit tested.

type ScopeArgs = Parameters<typeof scopeArgs>[2];

export function forOrg(orgId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          return query(scopeArgs(model, operation, args as ScopeArgs, orgId) as typeof args);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof forOrg>;
