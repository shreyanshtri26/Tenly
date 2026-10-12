import { Bot, Building2, CreditCard, Gauge, KeyRound, ScrollText } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

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

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
      <section className="max-w-2xl">
        <p className="text-sm font-medium text-accent">Multi-tenant SaaS · MCP-ready</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Teams, roles and billing, built so AI agents can use them safely.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Tenly is a working SaaS foundation: organizations, invites, role-based access, Razorpay
          subscriptions, plan limits and an MCP server.
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
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text, href }) => (
          <Link key={title} href={href} className="group block">
            <Card className="h-full transition-colors group-hover:bg-secondary/50">
              <Icon className="size-5 text-accent" aria-hidden />
              <CardTitle className="mt-4">{title}</CardTitle>
              <CardDescription className="mt-2">{text}</CardDescription>
              <span className="mt-4 inline-block text-sm font-medium text-accent">Learn more →</span>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  );
}
