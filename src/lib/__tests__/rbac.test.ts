import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import { assertCan, can, canAssignRole, PERMISSIONS } from "@/lib/rbac";

describe("rbac", () => {
  it("gives the owner every permission", () => {
    for (const permission of PERMISSIONS) expect(can("OWNER", permission)).toBe(true);
  });

  it("does not let admins delete the org or manage billing", () => {
    expect(can("ADMIN", "org:delete")).toBe(false);
    expect(can("ADMIN", "billing:manage")).toBe(false);
  });

  it("does not let members invite or remove people", () => {
    expect(can("MEMBER", "member:invite")).toBe(false);
    expect(can("MEMBER", "member:remove")).toBe(false);
    expect(can("MEMBER", "project:create")).toBe(true);
  });

  it("throws ForbiddenError when a permission is missing", () => {
    expect(() => assertCan("MEMBER", "apikey:manage")).toThrow(ForbiddenError);
  });

  it("never lets someone grant a role above their own", () => {
    expect(canAssignRole("ADMIN", "OWNER")).toBe(false);
    expect(canAssignRole("ADMIN", "ADMIN")).toBe(true);
    expect(canAssignRole("MEMBER", "ADMIN")).toBe(false);
  });
});
