import { connection } from "next/server";
import { ErrorNotice, OrgNav } from "@/components/org-nav";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PLANS } from "@/lib/plans";
import { can } from "@/lib/rbac";
import { requireOrgPage } from "@/lib/session";
import { cancelSubscriptionAction, startCheckoutAction } from "../../actions";

export const metadata = { title: "Billing" };

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  // Read the request before touching cookies, so the build does not prerender this page.
  await connection();
  const { slug } = await params;
  const { error } = await searchParams;
  const ctx = await requireOrgPage(slug);
  const subscription = await ctx.db.subscription.findFirst();
  const canManage = can(ctx.role, "billing:manage");
  const active = subscription?.status === "ACTIVE";

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <OrgNav slug={slug} />
      <ErrorNotice message={error} />

      <Card className="mt-8">
        <CardTitle>Current plan: {PLANS[ctx.plan].name}</CardTitle>
        <CardDescription className="mt-2">
          {active && subscription?.currentPeriodEnd
            ? subscription.cancelAtPeriodEnd
              ? `Ends on ${subscription.currentPeriodEnd.toDateString()}. It will not renew.`
              : `Renews on ${subscription.currentPeriodEnd.toDateString()}.`
            : "No active paid subscription."}
        </CardDescription>
        {active && canManage && !subscription?.cancelAtPeriodEnd && (
          <form action={cancelSubscriptionAction.bind(null, slug)} className="mt-4">
            <Button type="submit" variant="outline" size="sm">
              Cancel at period end
            </Button>
          </form>
        )}
      </Card>

      {canManage ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {(["PRO", "TEAM"] as const).map((plan) => (
            <Card key={plan}>
              <CardTitle>{PLANS[plan].name}</CardTitle>
              <CardDescription className="mt-2">
                Pay with Razorpay (test mode). Your plan changes once payment succeeds.
              </CardDescription>
              <form action={startCheckoutAction.bind(null, slug)} className="mt-4">
                <input type="hidden" name="plan" value={plan} />
                <Button type="submit" className="w-full" disabled={ctx.plan === plan && active}>
                  {ctx.plan === plan && active ? "Current plan" : `Choose ${PLANS[plan].name}`}
                </Button>
              </form>
            </Card>
          ))}
        </section>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">Only owners can change billing.</p>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Downgrading to Free keeps your data. Over-limit actions are blocked until usage fits the Free plan.
      </p>
    </main>
  );
}
