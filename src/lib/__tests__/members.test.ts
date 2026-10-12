import { describe, expect, it } from "vitest";
import { memberChangeError } from "@/lib/rbac";
import { slugify } from "@/lib/slug";

const member = { userId: "u-member", role: "MEMBER" as const };
const owner = { userId: "u-owner", role: "OWNER" as const };
describe("memberChangeError", () => {
  it("lets an owner promote a member to admin", () => {
    expect(
      memberChangeError({ actorId: "u-owner", actorRole: "OWNER", target: member, newRole: "ADMIN", ownerCount: 1 }),
    ).toBeNull();
  });

  it("stops anyone from changing their own membership", () => {
    expect(
      memberChangeError({ actorId: "u-owner", actorRole: "OWNER", target: owner, newRole: "MEMBER", ownerCount: 2 }),
    ).toMatch(/your own/);
  });

  it("stops an admin from touching an owner", () => {
    expect(
      memberChangeError({ actorId: "u-admin", actorRole: "ADMIN", target: owner, ownerCount: 2 }),
    ).toMatch(/higher role/);
  });

  it("stops an admin from granting a role above their own", () => {
    expect(
      memberChangeError({ actorId: "u-admin", actorRole: "ADMIN", target: member, newRole: "OWNER", ownerCount: 1 }),
    ).toMatch(/above your own/);
  });

  it("never lets the last owner be demoted or removed", () => {
    expect(
      memberChangeError({ actorId: "u-admin", actorRole: "OWNER", target: owner, newRole: "ADMIN", ownerCount: 1 }),
    ).toMatch(/at least one owner/);
    expect(memberChangeError({ actorId: "x", actorRole: "OWNER", target: owner, ownerCount: 1 })).toMatch(
      /at least one owner/,
    );
  });

  it("allows removing an owner when another owner remains", () => {
    expect(memberChangeError({ actorId: "x", actorRole: "OWNER", target: owner, ownerCount: 2 })).toBeNull();
  });

  it("allows an admin to remove a member", () => {
    const otherAdmin = { userId: "u-other-admin", role: "ADMIN" as const };
    expect(memberChangeError({ actorId: "u-admin", actorRole: "ADMIN", target: otherAdmin, ownerCount: 1 })).toBeNull();
  });
});

describe("slugify", () => {
  it("makes a URL-safe slug with a unique suffix", () => {
    const a = slugify("Acme Corp!");
    const b = slugify("Acme Corp!");
    expect(a).toMatch(/^acme-corp-[0-9a-f]{6}$/);
    expect(a).not.toBe(b);
  });

  it("falls back when the name has no letters", () => {
    expect(slugify("!!!")).toMatch(/^org-[0-9a-f]{6}$/);
  });
});
