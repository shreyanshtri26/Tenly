import type { Plan, SubscriptionStatus } from "@/generated/prisma/enums";

// Maps a Razorpay subscription webhook to the change Tenly should apply.
// Kept pure (no database, no network) so every event type is unit tested.
//
// Razorpay docs: https://razorpay.com/docs/webhooks/payloads/subscriptions/
// The orgId is attached to the subscription as a note when checkout starts,
// so the webhook never has to trust anything sent by the browser.

export type RazorpaySubscriptionEvent = {
  event: string;
  payload: {
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        status: string;
        current_end?: number | null;
        notes?: Record<string, string> | unknown[];
      };
    };
  };
};

export type SubscriptionChange = {
  orgId: string;
  razorpaySubscriptionId: string;
  plan: Plan;
  status: SubscriptionStatus;
  /** The plan the organization should be on right now. */
  effectivePlan: Plan;
  currentPeriodEnd: Date | null;
};

const STATUS_BY_EVENT: Record<string, SubscriptionStatus> = {
  "subscription.activated": "ACTIVE",
  "subscription.charged": "ACTIVE",
  "subscription.resumed": "ACTIVE",
  "subscription.pending": "PAST_DUE",
  "subscription.halted": "PAST_DUE",
  "subscription.cancelled": "CANCELED",
  "subscription.completed": "CANCELED",
};

export function subscriptionChangeFromEvent(
  body: RazorpaySubscriptionEvent,
  planIds: Partial<Record<"PRO" | "TEAM", string>>,
): SubscriptionChange | null {
  const status = STATUS_BY_EVENT[body.event];
  const sub = body.payload.subscription?.entity;
  if (!status || !sub) return null; // An event Tenly does not act on.

  const notes = Array.isArray(sub.notes) ? {} : (sub.notes ?? {});
  const orgId = (notes as Record<string, string>).orgId;
  if (!orgId) return null;

  const plan: Plan | null =
    sub.plan_id === planIds.PRO ? "PRO" : sub.plan_id === planIds.TEAM ? "TEAM" : null;
  if (!plan) return null;

  return {
    orgId,
    razorpaySubscriptionId: sub.id,
    plan,
    status,
    // A cancelled or unpaid subscription drops the org back to FREE.
    effectivePlan: status === "ACTIVE" ? plan : "FREE",
    currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : null,
  };
}
