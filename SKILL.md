---
project: Tenly
track: full-stack
level: intermediate
started: 2026-10-12
shipped: <YYYY-MM-DD>
repo: https://github.com/shreyanshtri26/Tenly
live: https://tenly.vercel.app
---

> **How to use this file.** This is the engineering log from _The Resume Project
> Vault_ method. Sections 1 to 4 were drafted during setup. **Rewrite them in
> your own words**, then fill in sections 5 to 10 _while_ you build, the same day
> something happens. If you cannot explain a line here out loud, it does not go
> on your resume yet.

# 1. What this project is

**To a friend:** Tenly is the account system behind a business app: companies
sign up, invite their team, choose a paid plan, and can let an AI assistant do
tasks for them without giving it more power than the person using it.

**To an engineer:** a multi-tenant Next.js SaaS with row-scoped tenant
isolation, table-driven RBAC, Razorpay subscription billing with idempotent
webhooks, plan-based usage metering, and an MCP server whose tools share one
implementation with the UI and an LLM assistant.

# 2. Problem it solves

Every B2B product rebuilds organizations, roles, billing and limits, and gets
the dangerous parts wrong: a missing `where orgId` leaks data, a retried webhook
double-applies a plan change, a role check lives in one route but not another.
Adding AI agents makes this worse, because an agent can call endpoints the UI
never exposes. Tenly makes those mistakes structurally hard: scoping happens in
the data layer, permissions live in one table, and agents go through the exact
same code path as people.

# 3. Architecture

See the diagram in [README.md](README.md#architecture).

Components:
- Next.js route handlers and Server Components → UI and API → one deployable on Vercel's free tier, no separate backend to host
- `tools.ts` → every business operation, defined once → the UI, MCP server and assistant cannot drift apart
- `forOrg()` Prisma extension → tenant scoping → enforced centrally instead of remembered per query
- Neon PostgreSQL → system of record → relational constraints (unique keys, foreign keys) do real work: idempotency and membership integrity
- Better Auth → authentication only → authorization stays in Tenly's own code, which is the part worth explaining
- Upstash Redis → rate-limit counters → shared across serverless instances; an in-memory counter would reset per instance
- Gemini / Groq → assistant LLM → both free with no card; fallback keeps the demo working when one is rate-limited

# 4. Key decisions and trade-offs

| Decision | Options I considered | What I chose | Why | What I gave up |
|---|---|---|---|---|
| Tenant isolation | `where orgId` in every query; Postgres row-level security; Prisma client extension | Prisma extension (`forOrg`) | Central, testable, works with Neon's serverless driver without session variables | Nested relation queries are not rewritten; RLS would be stronger |
| Authentication library | Auth.js v5 (still beta); Better Auth; Clerk | Better Auth | Stable, open source, data in my own Postgres, no vendor limits | Fewer tutorials than Auth.js; a second library to learn |
| Background email | pg-boss queue; Upstash QStash; Next.js `after()` | `after()` | No worker process to host on serverless; one less service | No automatic retry on failure |
| Webhook idempotency | Check-then-insert; Redis lock; unique primary key in the same transaction | Unique key in the same transaction | The database guarantees it, even under concurrent retries | One extra row per event |
| MCP authentication | OAuth 2.1; org-scoped API keys | API keys first, OAuth later | Ships the MCP server in a week; keys are hashed and scoped to a role | Users paste a key instead of one-click connect |
| LLM provider | Paid API; one free provider; free providers with fallback | Gemini → Groq fallback | ₹0 cost, demo survives one provider's rate limit | Free-tier prompts may be used for training, so demo data only |
| | | | | |

# 5. Skills demonstrated

- [ ] Multi-tenant data isolation, evidence: `src/lib/tenant-scope.ts` + tests
- [ ] Role-based access control, evidence: `src/lib/rbac.ts` + tests
- [ ] Payment webhook security and idempotency, evidence: `src/app/api/webhooks/razorpay/route.ts`
- [ ] Usage metering and plan feature flags, evidence: `src/lib/usage.ts`, `src/lib/plans.ts`
- [ ] MCP server design, evidence: `src/app/api/mcp/route.ts`
- [ ] LLM tool calling with cost controls, evidence: `src/app/api/assistant/route.ts`
- [ ] End-to-end TypeScript with Prisma, evidence: `pnpm typecheck` in CI

# 6. Numbers I measured

Fill these in only with numbers you measured yourself.

| Metric | Before | After | How I measured it |
|---|---|---|---|
| Duplicate webhook deliveries applied | | 1 of 3 | Replayed the same event id 3 times |
| p95 latency of `/api/mcp` `list_projects` | | | k6, 50 virtual users, 1 minute |
| Assistant cost per question | | ₹0 | Free tiers; tokens logged per request |
| | | | |

# 7. Things that broke and how I fixed them

1. Symptom:
   Cause:
   Fix:
   Lesson:

# 8. What I would do differently at 100x scale

-
-
-

# 9. Interview answers I have rehearsed

Q: A payment webhook is delivered three times. What exactly happens, and why does the plan change only once?
A:

Q: How do you guarantee that a user in Org A can never read Org B's rows? Show me the code path.
A:

Q: A customer downgrades mid-cycle. Walk me through every record that changes.
A:

Q: An AI agent calls `invite_member`. What stops it from inviting someone as Owner?
A:

# 10. Honest limitations

See [README.md](README.md#honest-limitations). Add anything new you discover.

# 11. How to run it

See [README.md](README.md#getting-started).

# 12. Credits

- Project brief: _The Resume Project Vault 2026_, card A2 (Multi-Tenant SaaS Starter), @pratham.codes
- MCP + assistant layer: original extension
- Add every tutorial, repository or article you learn from here.
