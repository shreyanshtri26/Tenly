import { describe, expect, it } from "vitest";
import { hasFeature, limitFor, usageState } from "@/lib/plans";

describe("plans", () => {
  it("reads limits and features from one config", () => {
    expect(limitFor("FREE", "projects")).toBe(3);
    expect(limitFor("TEAM", "projects")).toBe(Infinity);
    expect(hasFeature("FREE", "mcpAccess")).toBe(false);
    expect(hasFeature("PRO", "mcpAccess")).toBe(true);
  });

  it("warns at 80% and blocks at 100%", () => {
    expect(usageState(1, 10)).toBe("ok");
    expect(usageState(8, 10)).toBe("soft");
    expect(usageState(10, 10)).toBe("hard");
    expect(usageState(999, Infinity)).toBe("ok");
  });
});
