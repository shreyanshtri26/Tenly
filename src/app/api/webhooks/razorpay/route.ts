import { Prisma } from "@/generated/prisma/client";
import { subscriptionChangeFromEvent, type RazorpaySubscriptionEvent } from "@/lib/billing";
import { verifyRazorpaySignature } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

// Razorpay subscription webhook.
//
// Guarantees:
//  1. Authentic: the HMAC signature over the raw body must match.
//  2. Idempotent: Razorpay retries deliveries, so each event id is recorded in
//     WebhookEvent inside the same transaction as its effect. A retry hits the
//     primary-key conflict and is acknowledged without being applied twice.
//  3. Atomic: if applying the change fails, the event row rolls back too, so
//     Razorpay's next retry processes it again.

export async function POST(request: Request) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    return Response.json({ error: "webhooks_not_configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!verifyRazorpaySignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)) {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  const eventId = request.headers.get("x-razorpay-event-id");
  if (!eventId) {
    return Response.json({ error: "missing_event_id" }, { status: 400 });
  }

  const body = JSON.parse(rawBody) as RazorpaySubscriptionEvent;
  const change = subscriptionChangeFromEvent(body, {
    PRO: env.RAZORPAY_PLAN_ID_PRO,
    TEAM: env.RAZORPAY_PLAN_ID_TEAM,
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.webhookEvent.create({
        data: { id: eventId, provider: "razorpay", type: body.event, processedAt: new Date() },
      });
      if (!change) return; // Recorded, but nothing for Tenly to do.

      await tx.subscription.upsert({
        where: { orgId: change.orgId },
        create: {
          orgId: change.orgId,
          plan: change.plan,
          status: change.status,
          razorpaySubscriptionId: change.razorpaySubscriptionId,
          currentPeriodEnd: change.currentPeriodEnd,
        },
        update: {
          plan: change.plan,
          status: change.status,
          razorpaySubscriptionId: change.razorpaySubscriptionId,
          currentPeriodEnd: change.currentPeriodEnd,
        },
      });
      await tx.organization.update({
        where: { id: change.orgId },
        data: { plan: change.effectivePlan },
      });
      await tx.auditLog.create({
        data: {
          orgId: change.orgId,
          actorUserId: null,
          action: "plan.changed",
          metadata: { event: body.event, plan: change.effectivePlan, status: change.status },
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ received: true, duplicate: true });
    }
    console.error("[razorpay-webhook] failed", { eventId, event: body.event, error });
    return Response.json({ error: "processing_failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
