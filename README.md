# Tenly

**A multi-tenant SaaS starter where AI agents get exactly the permissions of the person behind them.**

Tenly gives a product the parts every B2B SaaS needs (organizations, invites, roles, paid plans, usage limits and an audit log) and exposes them through an **MCP server**, so Claude, Cursor and other agents can manage an organization through the same permission checks as the web app.

[![CI](https://github.com/shreyanshtri26/Tenly/actions/workflows/ci.yml/badge.svg)](https://github.com/shreyanshtri26/Tenly/actions/workflows/ci.yml)
&nbsp;Live demo: `https://tenly-ai.vercel.app`

---

## Contents

- [What it demonstrates](#what-it-demonstrates)
- [Features and status](#features-and-status)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Key design decisions](#key-design-decisions)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Connecting an MCP client](#connecting-an-mcp-client)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Honest limitations](#honest-limitations)
- [Interview questions this project answers](#interview-questions-this-project-answers)

---

## What it demonstrates

| Concept | Where to look |
|---|---|
| Row-level tenant isolation | [`src/lib/tenant-scope.ts`](src/lib/tenant-scope.ts), [`src/lib/tenant.ts`](src/lib/tenant.ts) |
| Role-based access control from one table | [`src/lib/rbac.ts`](src/lib/rbac.ts) |
| Signed, idempotent, atomic payment webhooks | [`src/app/api/webhooks/razorpay/route.ts`](src/app/api/webhooks/razorpay/route.ts) |
| Plan features and usage metering | [`src/lib/plans.ts`](src/lib/plans.ts), [`src/lib/usage.ts`](src/lib/usage.ts) |
| One set of operations shared by UI, MCP and an AI assistant | [`src/lib/tools.ts`](src/lib/tools.ts) |
| MCP server with API-key auth | [`src/app/api/mcp/route.ts`](src/app/api/mcp/route.ts) |
| LLM provider fallback on free tiers | [`src/lib/llm.ts`](src/lib/llm.ts), [`src/app/api/assistant/route.ts`](src/app/api/assistant/route.ts) |
| Secrets stored only as hashes | [`src/lib/crypto.ts`](src/lib/crypto.ts) |

## Features and status

✅ built and tested in the foundation · 🚧 on the [roadmap](#roadmap)

| Feature | Status |
|---|---|
| Email/password and Google sign-in (Neon Auth) | ✅ |
| Data model: orgs, memberships, invites, projects, subscriptions, usage, audit log, API keys | ✅ |
| Automatic tenant scoping of every query on tenant tables | ✅ |
| Owner / Admin / Member permission table; no one can grant a role above their own | ✅ |
| Plan config (Free / Pro / Team) with soft limit at 80% and hard limit at 100% | ✅ |
| Razorpay webhook: HMAC signature, idempotency ledger, single transaction | ✅ |
| MCP server at `/api/mcp` with 5 tools and org-scoped API keys | ✅ |
| "Ask Tenly" assistant API with Gemini → Groq fallback and rate limits | ✅ |
| Invite emails sent after the response (Gmail SMTP) | ✅ |
| Create-organization flow and org dashboard (projects, usage) | ✅ |
| Invites (accept page, expiry, revoke), member management, role changes, audit-logged | ✅ |
| Razorpay checkout (hosted, test mode), cancel at period end; needs test-mode keys and plan IDs | ✅ |
| API key management UI (shown once, revocable) and audit log viewer | ✅ |
| Assistant chat UI | ✅ |
| OAuth for MCP clients (one-click connect instead of API keys) | 🚧 Week 5 |

## Architecture

```
                      ┌────────────────────────── Vercel (free) ──────────────────────────┐
 Browser ────────────►│  Next.js App Router                                               │
                      │   ├─ pages (Server Components)                                    │
 Claude / Cursor ────►│   ├─ /api/mcp ───────────┐                                        │
 (MCP + API key)      │   ├─ /api/assistant ─────┤  every caller resolves an OrgContext   │
                      │   ├─ server actions ─────┤  (user, org, role, plan, scoped db)    │
 Razorpay ───────────►│   └─ /api/webhooks/razorpay                                       │
 (signed webhook)     │                          ▼                                        │
                      │                    src/lib/tools.ts                               │
                      │          permission check → plan limit → write → audit log        │
                      └───────┬──────────────────┬──────────────────┬────────────────────┘
                              ▼                  ▼                  ▼
                      Neon PostgreSQL      Upstash Redis       Gemini / Groq
                      (Prisma, scoped)     (rate limits)       (assistant LLM)
```

**Request flow for an MCP tool call** (for example, `create_project`):

1. `withMcpAuth` reads `Authorization: Bearer tnly_…`, hashes it and looks up the API key.
2. The key resolves to an organization, a user and a role. A key can carry a lower role than its creator, never a higher one.
3. Rate limit (Upstash) and plan feature check (`mcpAccess`).
4. `tool.execute()` runs the **same code the web UI uses**: permission check, plan limit, database write through the tenant-scoped client, audit log entry.

## Tech stack

Every service has a free tier that needs **no credit card**.

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, Cache Components), TypeScript | One deployable for UI, API routes and the MCP endpoint |
| UI | Tailwind CSS v4, shadcn/ui-style components | Accessible primitives, tokens in one CSS file |
| Database | Neon PostgreSQL + Prisma 7 (Neon driver adapter) | Serverless Postgres that scales to zero; typed queries |
| Auth | Neon Auth (email/password, Google) | Managed by Neon, users in the same Postgres project. Authorization is Tenly's own code |
| Payments | Razorpay (test mode) | Indian payment gateway with subscriptions and signed webhooks |
| Email | Nodemailer + Gmail SMTP | Free, no domain needed; console output in development |
| Rate limiting | Upstash Redis | Counters shared across serverless instances |
| MCP | `mcp-handler` + MCP TypeScript SDK v2 | Streamable HTTP on a Next.js route |
| LLM | Vercel AI SDK, Gemini (free tier) → Groq (free tier) | Tool calling with automatic provider fallback |
| Tests / CI | Vitest, GitHub Actions | Unit tests for the rules that must never break |
| Hosting | Vercel Hobby | Free, deploys from GitHub |

## Key design decisions

The full reasoning, including what each choice gave up, lives in [`SKILL.md`](SKILL.md#4-key-decisions-and-trade-offs).

1. **Tenant isolation in the data layer, not in each query.** `forOrg(orgId)` is a Prisma client extension that adds `orgId` to every read, write and delete on tenant tables and refuses to create rows for another org. Forgetting a `where` clause can no longer leak data.
2. **Permissions in one table.** `rbac.ts` maps each role to its permissions. Routes call `assertCan(role, "member:invite")`; nothing else compares role names.
3. **One implementation, three interfaces.** Each operation in `tools.ts` is defined once with a zod schema, a permission and a `mutates` flag. The web UI, the MCP server and the assistant all call it, so an agent can never bypass a check the UI enforces.
4. **Webhooks are idempotent by construction.** The Razorpay event id is a primary key in `WebhookEvent`, inserted in the same transaction as the plan change. A retry hits a unique-constraint error and is acknowledged without being applied twice; a failure rolls back both.
5. **Secrets are stored as SHA-256 hashes.** Invite tokens and API keys are shown once and never stored in plain text.
6. **No job queue, by choice.** Invite emails use Next.js `after()` to send once the response has gone out. That avoids running a separate worker on a serverless host; the trade-off (no automatic retry) is documented.

## Project structure

```
prisma/
  schema.prisma          Data model (auth tables + tenant tables)
src/
  app/
    page.tsx             Landing page
    sign-in/             Email/password and Google sign-in
    dashboard/           Organization list (streams in behind <Suspense>)
    api/
      auth/[...path]/     Neon Auth handler
      mcp/               MCP server (Streamable HTTP, API-key auth)
      assistant/         "Ask Tenly" (LLM + the same tools)
      webhooks/razorpay/ Signed, idempotent subscription webhook
      health/            Liveness + database check
  components/ui/         shadcn/ui-style primitives
  lib/
    tools.ts             Every operation: schema, permission, limits, audit
    session.ts           Resolves the caller's OrgContext
    tenant.ts            forOrg(orgId): tenant-scoped Prisma client
    tenant-scope.ts      The pure scoping rule (unit tested)
    rbac.ts              Role → permission table
    plans.ts             Plan limits and features
    usage.ts             Metering and limit checks
    billing.ts           Razorpay event → subscription change (unit tested)
    crypto.ts            Hashing, HMAC, API keys
    llm.ts               Gemini / Groq setup
    ratelimit.ts         Upstash sliding-window limits
    email.ts             Gmail SMTP / console output
    audit.ts             Audit log writer
    env.ts               Validated environment variables
    __tests__/           Vitest unit tests
SKILL.md                 Engineering log: decisions, numbers, bugs, interview answers
```

## Getting started

**Prerequisites:** Node.js 22+, pnpm 10+ (`npm i -g pnpm`), and a free [Neon](https://neon.com) account.

```bash
git clone https://github.com/shreyanshtri26/Tenly.git
cd Tenly
pnpm install                 # also generates the Prisma client
cp .env.example .env         # then fill in DATABASE_URL, DIRECT_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET
pnpm db:migrate              # creates the tables in Neon (name the first migration "init")
pnpm dev                     # http://localhost:3000
```

Only the first block of `.env.example` is required. Each optional integration switches on when its variables are set:

| Without… | What happens |
|---|---|
| Google keys | Email/password sign-in still works |
| Gmail App Password | Emails are printed to the terminal |
| Upstash | Rate limits are skipped (warning logged in production) |
| Gemini and Groq keys | The assistant returns `503 assistant_not_configured` |
| Razorpay webhook secret | The webhook returns `503 webhooks_not_configured` |

**Tip:** create a `dev` branch in Neon and point your local `.env` at it, so local experiments never touch the demo data.

### Razorpay in test mode

1. In the [Razorpay dashboard](https://dashboard.razorpay.com), switch on **Test Mode**. No real money moves.
2. Create two subscription plans (Pro ₹499/month, Team ₹1,499/month) and copy their plan ids into `.env`.
3. Add a webhook pointing to `https://<your-app>/api/webhooks/razorpay` with the `subscription.*` events, and copy its secret into `RAZORPAY_WEBHOOK_SECRET`.
4. For local testing, expose your dev server with a tunnel (for example `npx cloudflared tunnel --url http://localhost:3000`).

## Connecting an MCP client

MCP access is enabled on the **Pro** and **Team** plans. Create an API key for your organization (the API-key UI arrives in Week 4; until then, insert one with `pnpm db:studio`), then add Tenly to your MCP client.

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tenly": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote", "https://tenly-ai.vercel.app/api/mcp",
        "--header", "Authorization: Bearer ${TENLY_API_KEY}"
      ],
      "env": { "TENLY_API_KEY": "tnly_xxxxxxxx_..." }
    }
  }
}
```

Available tools: `list_projects`, `create_project`, `list_members`, `invite_member`, `get_usage`.

## Testing

```bash
pnpm test        # unit tests (tenant scoping, RBAC, plans, webhook mapping, crypto)
pnpm typecheck
pnpm lint
```

The tests cover the rules that must never break: tenant isolation, role checks, plan limits, webhook signature verification and the Razorpay event mapping. CI runs all of them, plus a production build, on every push.

## Deployment

1. Import the repo in [Vercel](https://vercel.com/new) (Hobby plan, sign in with GitHub, no card).
2. Add the environment variables from `.env.example`. Set `APP_URL` to your Vercel URL.
3. Run migrations against Neon from your machine: `pnpm db:deploy`.
4. In Google Cloud, add `https://<your-app>.vercel.app/api/auth/callback/google` as a redirect URI.

## Roadmap

| Week | Goal | Done when |
|---|---|---|
| 1 | Foundation (this commit) | CI green, tests pass, `/api/health` returns `ok` against Neon |
| 2 | Organizations and members | Create org, invite, accept invite, change role, remove member, all audit-logged |
| 3 | Billing | Razorpay checkout in test mode; webhook replayed 3× changes the plan once; downgrade blocks over-limit actions |
| 4 | Agents | API key UI, assistant chat UI, audit log viewer |
| 5 | Polish and proof | MCP OAuth, integration tests for tenant isolation and webhooks, demo video, measured numbers in SKILL.md |

## Honest limitations

- **Tenant scoping covers top-level queries only.** Nested writes and `include`/`select` on relations are not rewritten by the extension. Tenant data is always fetched through a scoped top-level query; Postgres row-level security would close this fully and is a candidate for later.
- **Invite emails are not retried.** `after()` sends once; a failed send is logged, and the inviter can resend.
- **MCP auth uses API keys for now.** OAuth is on the roadmap.
- **Free tiers have cold starts.** Neon suspends after 5 minutes idle, so the first request after a pause is slower.

## Interview questions this project answers

1. A payment webhook is delivered three times. What happens, and why does the plan change only once?
2. How do you guarantee a user in Org A can never read Org B's rows? Show the code path.
3. A customer downgrades mid-cycle. Which records change?
4. An AI agent calls `invite_member`. What stops it from inviting someone as Owner?

Rehearsed answers live in [`SKILL.md`](SKILL.md#9-interview-answers-i-have-rehearsed).

## Credits

Project brief adapted from _The Resume Project Vault 2026_ (A2, Multi-Tenant SaaS Starter) by @pratham.codes. The MCP and AI assistant layer is an original extension.

## License

[MIT](LICENSE)
