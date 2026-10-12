import { describe, expect, it } from "vitest";
import { scopeArgs, TenantViolationError } from "@/lib/tenant-scope";

const ORG = "org_a";

describe("scopeArgs (tenant isolation)", () => {
  it("adds orgId to reads", () => {
    expect(scopeArgs("Project", "findMany", { where: { name: "x" } }, ORG)).toEqual({
      where: { name: "x", orgId: ORG },
    });
  });

  it("adds orgId to lookups by id, so another org's id returns nothing", () => {
    expect(scopeArgs("Project", "findUnique", { where: { id: "p1" } }, ORG)).toEqual({
      where: { id: "p1", orgId: ORG },
    });
  });

  it("scopes updates and deletes", () => {
    expect(scopeArgs("Project", "delete", { where: { id: "p1" } }, ORG).where).toMatchObject({ orgId: ORG });
    expect(scopeArgs("Invite", "updateMany", { data: {} }, ORG).where).toEqual({ orgId: ORG });
  });

  it("stamps orgId on creates, including createMany", () => {
    expect(scopeArgs("Project", "create", { data: { name: "x" } }, ORG).data).toEqual({ name: "x", orgId: ORG });
    expect(scopeArgs("AuditLog", "createMany", { data: [{ action: "a" }, { action: "b" }] }, ORG).data).toEqual([
      { action: "a", orgId: ORG },
      { action: "b", orgId: ORG },
    ]);
  });

  it("refuses to create a row for a different org", () => {
    expect(() => scopeArgs("Project", "create", { data: { name: "x", orgId: "org_b" } }, ORG)).toThrow(
      TenantViolationError,
    );
  });

  it("leaves non-tenant models alone", () => {
    const args = { where: { id: "u1" } };
    expect(scopeArgs("User", "findUnique", args, ORG)).toBe(args);
  });

  it("requires an orgId", () => {
    expect(() => scopeArgs("Project", "findMany", {}, "")).toThrow(TenantViolationError);
  });
});
