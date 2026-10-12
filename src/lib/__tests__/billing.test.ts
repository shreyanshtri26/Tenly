import { describe, expect, it } from "vitest";
import { subscriptionChangeFromEvent, type RazorpaySubscriptionEvent } from "@/lib/billing";

const PLAN_IDS = { PRO: "plan_pro", TEAM: "plan_team" };

function event(name: string, overrides: Partial<{ plan_id: string; notes: Record<string, string> }> = {}) {
  return {
    event: name,
    payload: {
      subscription: {
        entity: {
          id: "sub_1",
          plan_id: overrides.plan_id ?? "plan_pro",
          status: "active",
          current_end: 1_800_000_000,
          notes: overrides.notes ?? { orgId: "org_1" },
        },
      },
    },
  } satisfies RazorpaySubscriptionEvent;
}

describe("subscriptionChangeFromEvent", () => {
  it("activates the paid plan", () => {
    const change = subscriptionChangeFromEvent(event("subscription.activated"), PLAN_IDS);
    expect(change).toMatchObject({ orgId: "org_1", plan: "PRO", status: "ACTIVE", effectivePlan: "PRO" });
    expect(change?.currentPeriodEnd?.toISOString()).toBe(new Date(1_800_000_000 * 1000).toISOString());
  });

  it("drops the org to FREE when the subscription is cancelled or halted", () => {
    expect(subscriptionChangeFromEvent(event("subscription.cancelled"), PLAN_IDS)?.effectivePlan).toBe("FREE");
    expect(subscriptionChangeFromEvent(event("subscription.halted"), PLAN_IDS)?.effectivePlan).toBe("FREE");
  });

  it("maps the Team plan id", () => {
    expect(subscriptionChangeFromEvent(event("subscription.charged", { plan_id: "plan_team" }), PLAN_IDS)?.plan).toBe(
      "TEAM",
    );
  });

  it("ignores events it does not handle, unknown plans and missing orgIds", () => {
    expect(subscriptionChangeFromEvent(event("payment.captured"), PLAN_IDS)).toBeNull();
    expect(subscriptionChangeFromEvent(event("subscription.activated", { plan_id: "other" }), PLAN_IDS)).toBeNull();
    expect(subscriptionChangeFromEvent(event("subscription.activated", { notes: {} }), PLAN_IDS)).toBeNull();
  });
});
