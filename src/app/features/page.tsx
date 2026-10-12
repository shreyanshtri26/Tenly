import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { AUDIT_ACTIONS } from "@/lib/audit";
import { PLANS, type Metric } from "@/lib/plans";
import { permissionsFor, PERMISSIONS } from "@/lib/rbac";
import { TOOLS } from "@/lib/tools";

export const metadata = { title: "Features" };

const ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
const METRICS: Metric[] = ["projects", "members", "assistant_messages"];

const AUDIT_TEXT: Record<(typeof AUDIT_ACTIONS)[number], string> = {
  "org.created": "An organization was created",
  "member.invited": "Someone was invited",
  "member.joined": "An invite was accepted",
  "member.removed": "A member was removed",
  "member.role_changed": "A member's role changed",
  "project.created": "A project was created",
  "project.deleted": "A project was deleted",
  "plan.changed": "The plan changed (payment webhook)",
  "apikey.created": "An API key was created",
  "apikey.revoked": "An API key was revoked",
};

function rupees(paise: number) {
  return paise === 0 ? "Free" : `₹${(paise / 100).toLocaleString("en-IN")} / month`;
}

function limit(value: number) {
  return Number.isFinite(value) ? value.toLocaleString("en-IN") : "Unlimited";
}

export default function FeaturesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-16 px-4 py-16">
      <header className="max-w-2xl">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Features</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Everything on the home page, with the real rules from the code. Sign in and create an organization to try it
          yourself.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/sign-in" className={buttonVariants()}>
            Sign in
          </Link>
          <Link href="/orgs/new" className={buttonVariants({ variant: "outline" })}>
            Create an organization
          </Link>
        </div>
      </header>

      <section id="organizations" className="scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">Organizations</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every project, member, invite and API key belongs to one organization. Tenant-owned queries are scoped to it
          automatically, so one organization cannot read another&apos;s rows.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
          Open your organizations →
        </Link>
      </section>

      <section id="roles" className="scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">Roles and permissions</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          One permission table decides every action. Nobody can grant a role above their own.
        </p>
        <div className="mt-6 overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Permission</th>
                {ROLES.map((role) => (
                  <th key={role} className="px-3 py-2 font-medium">
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {PERMISSIONS.map((permission) => (
                <tr key={permission}>
                  <td className="px-3 py-2 font-mono text-xs">{permission}</td>
                  {ROLES.map((role) => (
                    <td key={role} className="px-3 py-2">
                      {permissionsFor(role).includes(permission) ? "✓" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="subscriptions" className="scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">Subscriptions</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Plans are paid through Razorpay. The payment webhook is signed and idempotent: a retried event is applied
          exactly once. Only owners can change billing.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((key) => {
            const plan = PLANS[key];
            return (
              <Card key={key}>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription className="mt-2 text-lg font-semibold text-foreground">
                  {rupees(plan.pricePerMonthInPaise)}
                </CardDescription>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <li>MCP access: {plan.features.mcpAccess ? "yes" : "no"}</li>
                  <li>Audit log viewer: {plan.features.auditLog ? "yes" : "no"}</li>
                </ul>
              </Card>
            );
          })}
        </div>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
          Manage billing in your organization →
        </Link>
      </section>

      <section id="usage" className="scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">Usage limits</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          At 80% of a limit you get a warning. At 100% the action is blocked with a clear message.
        </p>
        <div className="mt-6 overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Limit</th>
                {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((key) => (
                  <th key={key} className="px-3 py-2 font-medium">
                    {PLANS[key].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {METRICS.map((metric) => (
                <tr key={metric}>
                  <td className="px-3 py-2 capitalize">{metric.replace("_", " ")}</td>
                  {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((key) => (
                    <td key={key} className="px-3 py-2">
                      {limit(PLANS[key].limits[metric])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="mcp" className="scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">MCP server</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Claude and other MCP clients connect to <code className="font-mono text-sm">https://tenly-ai.vercel.app/api/mcp</code>{" "}
          with an organization API key, sent as <code className="font-mono text-sm">Authorization: Bearer tnly_…</code>.
          Keys act with the role you give them. MCP needs the Pro or Team plan. Connecting with one click (OAuth) is
          not built yet; keys are the current method.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <Card key={tool.name}>
              <CardTitle className="font-mono text-sm">{tool.name}</CardTitle>
              <CardDescription className="mt-2">{tool.description}</CardDescription>
              <p className="mt-2 text-xs text-muted-foreground">
                {tool.mutates ? "Changes data. Agents confirm with you first." : "Read only."}
              </p>
            </Card>
          ))}
        </div>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
          Create an API key in your organization →
        </Link>
      </section>

      <section id="audit" className="scroll-mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">Audit log</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every sensitive change is recorded with who did it and when. Owners and admins can read the log in their
          organization.
        </p>
        <ul className="mt-6 divide-y rounded-md border">
          {AUDIT_ACTIONS.map((action) => (
            <li key={action} className="flex flex-wrap justify-between gap-2 px-4 py-2 text-sm">
              <span>{AUDIT_TEXT[action]}</span>
              <span className="font-mono text-xs text-muted-foreground">{action}</span>
            </li>
          ))}
        </ul>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
          Open an organization&apos;s audit log →
        </Link>
      </section>
    </main>
  );
}
