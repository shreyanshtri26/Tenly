import "server-only";
import { after } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { randomToken, sha256 } from "@/lib/crypto";
import { inviteEmail, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { ForbiddenError } from "@/lib/errors";
import { PLANS, usageState, type Metric } from "@/lib/plans";
import { assertCan, canAssignRole, type Permission } from "@/lib/rbac";
import type { OrgContext } from "@/lib/session";
import { assertWithinLimit, currentUsage } from "@/lib/usage";

// Tenly's operations, defined ONCE and exposed three ways:
//   1. the web UI (server actions),
//   2. the MCP server at /api/mcp (for Claude and other agents),
//   3. the in-app "Ask Tenly" assistant.
// Every path goes through the same permission check, plan limit and audit
// log, so an AI agent can never do more than the human behind it.

type ToolDef<S extends z.ZodType, R> = {
  name: string;
  title: string;
  description: string;
  permission: Permission;
  /** True when the tool changes data. Agents should confirm these with the user. */
  mutates: boolean;
  input: S;
  run: (ctx: OrgContext, input: z.infer<S>) => Promise<R>;
};

function defineTool<S extends z.ZodType, R>(def: ToolDef<S, R>) {
  return {
    ...def,
    async execute(ctx: OrgContext, rawInput: unknown): Promise<R> {
      assertCan(ctx.role, def.permission);
      const input = def.input.parse(rawInput);
      return def.run(ctx, input);
    },
  };
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const listProjects = defineTool({
  name: "list_projects",
  title: "List projects",
  description: "List the projects in the current organization, newest first.",
  permission: "project:read",
  mutates: false,
  input: z.object({ limit: z.number().int().min(1).max(100).default(20) }),
  run: (ctx, { limit }) =>
    ctx.db.project.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, name: true, description: true, createdAt: true },
    }),
});

export const createProject = defineTool({
  name: "create_project",
  title: "Create project",
  description: "Create a new project in the current organization. Counts toward the plan's project limit.",
  permission: "project:create",
  mutates: true,
  input: z.object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500).optional(),
  }),
  run: async (ctx, input) => {
    await assertWithinLimit(ctx.db, ctx.plan, "projects");
    const project = await ctx.db.project.create({
      data: { ...input, orgId: ctx.orgId, createdById: ctx.userId },
    });
    await recordAudit(ctx.db, {
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "project.created",
      targetType: "project",
      targetId: project.id,
    });
    return { id: project.id, name: project.name };
  },
});

export const listMembers = defineTool({
  name: "list_members",
  title: "List members",
  description: "List the members of the current organization and their roles.",
  permission: "member:read",
  mutates: false,
  input: z.object({}),
  run: async (ctx) => {
    const rows = await ctx.db.membership.findMany({
      orderBy: { createdAt: "asc" },
      select: { role: true, user: { select: { name: true, email: true } } },
    });
    return rows.map((m) => ({ name: m.user.name, email: m.user.email, role: m.role }));
  },
});

export const inviteMember = defineTool({
  name: "invite_member",
  title: "Invite member",
  description:
    "Invite someone to the current organization by email. They receive a link that expires in 7 days.",
  permission: "member:invite",
  mutates: true,
  input: z.object({
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
  }),
  run: async (ctx, { email, role }) => {
    if (!canAssignRole(ctx.role, role)) {
      throw new ForbiddenError(`A ${ctx.role} cannot invite someone as ${role}`);
    }
    await assertWithinLimit(ctx.db, ctx.plan, "members");

    const token = randomToken();
    const invite = await ctx.db.invite.create({
      data: {
        orgId: ctx.orgId,
        email,
        role,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        invitedById: ctx.userId,
      },
    });
    await recordAudit(ctx.db, {
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      action: "member.invited",
      targetType: "invite",
      targetId: invite.id,
      metadata: { email, role },
    });

    // Send the email after the response is returned, so the request stays fast.
    const acceptUrl = `${env.APP_URL}/invite/${token}`;
    // Trade-off: a failed send is logged but not retried (no queue on purpose).
    after(() =>
      sendEmail({ to: email, ...inviteEmail({ orgName: ctx.orgName, inviterName: "A teammate", acceptUrl }) }).catch(
        (error) => console.error("[invite-email] send failed", { inviteId: invite.id, error }),
      ),
    );

    return { inviteId: invite.id, email, role, expiresAt: invite.expiresAt };
  },
});

export const getUsage = defineTool({
  name: "get_usage",
  title: "Get plan usage",
  description: "Show the organization's plan and how much of each limit is used.",
  permission: "project:read",
  mutates: false,
  input: z.object({}),
  run: async (ctx) => {
    const plan = PLANS[ctx.plan];
    const metrics: Metric[] = ["projects", "members", "assistant_messages"];
    const usage = await Promise.all(
      metrics.map(async (metric) => {
        const used = await currentUsage(ctx.db, metric);
        const limit = plan.limits[metric];
        return {
          metric,
          used,
          limit: Number.isFinite(limit) ? limit : "unlimited",
          state: usageState(used, limit),
        };
      }),
    );
    return { plan: plan.name, usage };
  },
});

export const TOOLS = [listProjects, createProject, listMembers, inviteMember, getUsage] as const;
