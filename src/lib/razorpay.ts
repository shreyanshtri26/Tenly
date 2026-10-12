import "server-only";
import { env } from "@/lib/env";
import { BadRequestError } from "@/lib/errors";

// Minimal Razorpay REST client for subscriptions (test mode keys only).
// Docs: https://razorpay.com/docs/api/payments/subscriptions/

async function razorpay<T>(method: "POST", path: string, body: Record<string, unknown>): Promise<T> {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new BadRequestError("Billing is not configured yet");
  }
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    console.error("[razorpay] request failed", { path, status: response.status });
    throw new BadRequestError("Payment provider rejected the request. Try again later.");
  }
  return (await response.json()) as T;
}

/** Creates a hosted subscription. Returns the page where the customer pays. */
export async function createHostedSubscription(params: { planId: string; orgId: string }) {
  const result = await razorpay<{ id: string; short_url: string }>("POST", "/subscriptions", {
    plan_id: params.planId,
    total_count: 120,
    customer_notify: 1,
    // The webhook reads orgId from these notes; the browser never supplies it.
    notes: { orgId: params.orgId },
  });
  return { id: result.id, url: result.short_url };
}

/** Cancels at the end of the billing period, so the customer keeps what they paid for. */
export async function cancelAtPeriodEnd(subscriptionId: string) {
  await razorpay("POST", `/subscriptions/${subscriptionId}/cancel`, { cancel_at_cycle_end: 1 });
}
