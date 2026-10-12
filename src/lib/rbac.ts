import type { Role } from "@/generated/prisma/enums";
import { ForbiddenError } from "@/lib/errors";

// Role-based access control lives in ONE table. Components and routes never
// compare role strings themselves; they ask `can()` or call `assertCan()`.
// Adding a permission means editing this file and nothing else.

export const PERMISSIONS = [
  "project:read",
  "project:create",
  "project:delete",
  "member:read",
  "member:invite",
  "member:remove",
  "member:change_role",
  "billing:read",
  "billing:manage",
  "apikey:manage",
  "audit:read",
  "org:delete",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: PERMISSIONS,
  ADMIN: [
    "project:read",
    "project:create",
    "project:delete",
    "member:read",
    "member:invite",
    "member:remove",
    "billing:read",
    "apikey:manage",
    "audit:read",
  ],
  MEMBER: ["project:read", "project:create", "member:read"],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function assertCan(role: Role, permission: Permission): void {
  if (!can(role, permission)) {
    throw new ForbiddenError(`Your role (${role}) cannot perform "${permission}"`);
  }
}

// Roles are ordered so that nobody can grant a role higher than their own.
const RANK: Record<Role, number> = { MEMBER: 1, ADMIN: 2, OWNER: 3 };

export function canAssignRole(actor: Role, target: Role): boolean {
  return RANK[actor] >= RANK[target];
}
