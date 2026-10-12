import { Bot, Building2, CreditCard, Gauge, KeyRound, ScrollText } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Tenly · Teams, roles and billing for AI agents" };

const FEATURES = [
  {
    icon: Building2,
    title: "Organizations",
    href: "/features#organizations",
    text: "Every row belongs to one org. Queries are scoped automatically, so tenants never see each other's data.",
  },
  {
    icon: KeyRound,
    title: "Roles and permissions",
    href: "/features#roles",
    text: "Owner, Admin and Member, checked through one permission table on every request.",
  },
  {
    icon: CreditCard,
    title: "Subscriptions",
    href: "/features#subscriptions",
    text: "Razorpay plans with signed, idempotent webhooks. A retried payment event is applied exactly once.",
  },
  {
    icon: Gauge,
    title: "Usage limits",
    href: "/features#usage",
    text: "Each plan sets limits. Users get a warning at 80% and a clear block at 100%.",
  },
  {
    icon: Bot,
    title: "MCP server",
    href: "/features#mcp",
    text: "Claude and other agents can use Tenly through MCP, with the same permissions as the person behind them.",
  },
  {
    icon: ScrollText,
    title: "Audit log",
    href: "/features#audit",
    text: "Invites, role changes, plan changes and deletions are recorded with who did what and when.",
  },
];

// The payment event flow, as the code runs it. Each line is a real step.
const SUCCESS_PATH = [
  { at: "00:00.000", step: "webhook", text: "subscription.charged received" },
  { at: "00:00.004", step: "verify", text: "HMAC signature matches the raw body" },
  { at: "00:00.012", step: "ledger", text: "event id recorded in webhook_event" },
  { at: "00:00.021", step: "apply", text: "plan PRO, status ACTIVE, one transaction" },
  { at: "00:00.027", step: "audit", text: "plan.changed written to audit_log" },
];

const FAILURE_PATHS = [
  { label: "Retried delivery", result: "duplicate: true", text: "Same event id hits the primary key. Nothing changes twice." },
  { label: "Forged request", result: "400 invalid_signature", text: "Signature does not match. The body is never trusted." },
];

const STACK = [
  "Next.js 16 (App Router, Cache Components)",
  "Neon Postgres + Prisma 7",
  "Neon Auth (email, Google)",
  "Razorpay (test mode subscriptions)",
  "Gemini and Groq for the assistant",
  "MCP over Streamable HTTP",
  "Vitest, Playwright, GitHub Actions",
];

const DONE = [
  "Organizations, invites, roles, audit log",
  "Razorpay webhook: signed, idempotent, atomic",
  "Plan limits with 80% warning and 100% block",
  "API keys (shown once, revocable) and MCP tools",
  "Assistant with streaming answers and fallback",
  "Super admin console (read-only)",
];

const PLANNED = [
  "One-click MCP connect (OAuth), instead of API keys",
  "Retry and replay for failed webhook deliveries",
  "Row-level security in Postgres, as a second layer",
  "Integration tests for tenant isolation and webhooks",
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4">
      {/* Hero */}
      <section className="grid items-center gap-12 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
            Multi-tenant SaaS · MCP-ready
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Teams, roles and billing, built so AI agents can use them safely.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Tenly is a working SaaS foundation: organizations, invites, role-based access, Razorpay subscriptions,
            plan limits and an MCP server with the same permissions as the person behind it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
              Try the demo
            </Link>
            <a
              href="https://github.com/shreyanshtri26/Tenly"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              View the code
            </a>
          </div>
        </div>

        {/* Event-flow panel */}
        <div className="overflow-hidden rounded-xl border border-primary/25 bg-card shadow-2xl shadow-black/30">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <BrandMark className="size-4" />
            <span className="font-mono text-xs text-muted-foreground">payments.events</span>
            <span className="ml-auto font-mono text-[11px] text-accent">live path</span>
          </div>
          <ol className="space-y-2.5 p-4 font-mono text-xs leading-relaxed">
            {SUCCESS_PATH.map((row) => (
              <li key={row.at} className="grid grid-cols-[auto_auto_1fr] gap-3">
                <span className="text-muted-foreground">{row.at}</span>
                <span className="text-primary">{row.step.padEnd(7, " ")}</span>
                <span className="text-foreground">{row.text}</span>
              </li>
            ))}
          </ol>
          <div className="border-t border-border p-4 font-mono text-xs">
            <p className="text-muted-foreground">Same event delivered again →</p>
            <p className="mt-1 text-foreground">
              200 <span className="text-accent">{"{ duplicate: true }"}</span>, plan unchanged
            </p>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="scroll-mt-20 border-t border-border py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">One app, a database, and a few clear boundaries</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Pages, server actions, the API and the MCP endpoint share one set of business rules. Every tenant query goes
          through one scoped client.
        </p>
        <div className="mt-10 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium">Browser</p>
            <p className="mt-1 text-muted-foreground">Pages and forms. Server actions do the work.</p>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="font-medium text-primary">Tenly core</p>
            <p className="mt-1 text-muted-foreground">
              Permissions (rbac), plan limits, tenant scope, audit log. One place for every rule.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium">Postgres (Neon)</p>
            <p className="mt-1 text-muted-foreground">Auth users, tenant tables, webhook ledger, usage counters.</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium">Razorpay</p>
            <p className="mt-1 text-muted-foreground">Hosted checkout and signed subscription webhooks.</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium">MCP clients</p>
            <p className="mt-1 text-muted-foreground">Claude and other agents, using org API keys.</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium">LLMs</p>
            <p className="mt-1 text-muted-foreground">Gemini first, Groq as fallback, for the in-app assistant.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What it does</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text, href }) => (
            <Link key={title} href={href} className="group block">
              <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-secondary/50">
                <Icon className="size-5 text-primary" aria-hidden />
                <CardTitle className="mt-4">{title}</CardTitle>
                <CardDescription className="mt-2">{text}</CardDescription>
                <span className="mt-4 inline-block text-sm font-medium text-accent">Learn more →</span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Event flow */}
      <section id="event-flow" className="scroll-mt-20 border-t border-border py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">A payment event, start to finish</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          The success path changes the plan once. The failure paths are handled just as deliberately: a repeat is
          ignored, and a forged request never reaches the database.
        </p>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-primary/30 bg-card p-5">
            <p className="text-sm font-medium text-primary">Success path</p>
            <ol className="mt-4 space-y-3 text-sm">
              {SUCCESS_PATH.map((row, i) => (
                <li key={row.at} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{row.text}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-6">
            {FAILURE_PATHS.map((path) => (
              <div key={path.label} className="rounded-lg border border-border bg-card p-5">
                <p className="text-sm font-medium">{path.label}</p>
                <p className="mt-2 font-mono text-xs text-accent">{path.result}</p>
                <p className="mt-2 text-sm text-muted-foreground">{path.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stack and setup */}
      <section id="get-started" className="scroll-mt-20 border-t border-border py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Stack and setup</h2>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <ul className="space-y-2 text-sm">
            {STACK.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span aria-hidden className="size-1.5 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
          <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-xs leading-relaxed text-muted-foreground">
{`git clone https://github.com/shreyanshtri26/Tenly.git
cd Tenly && pnpm install
cp .env.example .env   # Neon URLs, auth secret
pnpm db:migrate
pnpm dev               # http://localhost:3000`}
          </pre>
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" className="scroll-mt-20 border-t border-border py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Status</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-primary/30 bg-card p-5">
            <p className="text-sm font-medium text-primary">Built and tested</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {DONE.map((item) => (
                <li key={item}>✓ {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm font-medium">Planned, not built yet</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {PLANNED.map((item) => (
                <li key={item}>○ {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-8 text-sm text-muted-foreground">
        <span>Tenly · MIT licensed</span>
        <div className="flex gap-4">
          <Link href="/features" className="hover:text-foreground">Features</Link>
          <Link href="/sign-in" className="hover:text-foreground">Sign in</Link>
          <a href="https://github.com/shreyanshtri26/Tenly" className="hover:text-foreground">GitHub</a>
        </div>
      </footer>
    </main>
  );
}
