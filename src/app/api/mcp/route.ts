import type { AuthInfo, ServerContext } from "@modelcontextprotocol/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { after } from "next/server";
import type { Role } from "@/generated/prisma/enums";
import { parseApiKey, sha256 } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { AppError, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { hasFeature } from "@/lib/plans";
import { enforceRateLimit } from "@/lib/ratelimit";
import { orgContextFor } from "@/lib/session";
import { TOOLS } from "@/lib/tools";

// Tenly's MCP server: lets Claude, Cursor and other MCP clients manage an
// organization through the same tools the web app uses.
//
// Auth: an org-scoped API key sent as `Authorization: Bearer tnly_...`.
// The key resolves to (org, user, role), and every tool call runs through the
// normal permission check, plan limits and audit log.
// Roadmap: replace API keys with OAuth so users can connect with one click.

type TenlyAuthExtra = { orgId: string; userId: string; role: Role; apiKeyId: string };

const handler = createMcpHandler(
  (server) => {
    for (const tool of TOOLS) {
      server.registerTool(
        tool.name,
        {
          title: tool.title,
          description: tool.description,
          inputSchema: tool.input,
          annotations: { readOnlyHint: !tool.mutates, destructiveHint: false },
        },
        async (args: unknown, ctx: ServerContext) => {
          try {
            const extra = ctx.http?.authInfo?.extra as TenlyAuthExtra | undefined;
            if (!extra) throw new UnauthorizedError("Missing API key");

            await enforceRateLimit("mcp", extra.apiKeyId);
            const orgCtx = await orgContextFor(extra.userId, { id: extra.orgId }, extra.role);
            if (!hasFeature(orgCtx.plan, "mcpAccess")) {
              throw new ForbiddenError("MCP access is available on the Pro and Team plans");
            }

            const result = await tool.execute(orgCtx, args);
            return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
          } catch (error) {
            const message = error instanceof AppError ? error.message : "Tool failed";
            if (!(error instanceof AppError)) console.error(`[mcp] ${tool.name} failed`, error);
            return { isError: true, content: [{ type: "text" as const, text: message }] };
          }
        },
      );
    }
  },
  {
    serverInfo: { name: "tenly", version: "0.1.0" },
    instructions:
      "Tenly manages an organization's projects, members and plan. " +
      "Tools that change data (create_project, invite_member) should be confirmed with the user first.",
  },
);

async function verifyApiKey(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken || !parseApiKey(bearerToken)) return undefined;

  const key = await prisma.apiKey.findUnique({ where: { keyHash: sha256(bearerToken) } });
  if (!key || key.revokedAt) return undefined;

  after(() => prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }));

  const extra: TenlyAuthExtra = {
    orgId: key.orgId,
    userId: key.createdById,
    role: key.role,
    apiKeyId: key.id,
  };
  return { token: bearerToken, clientId: key.id, scopes: [], extra };
}

const authedHandler = withMcpAuth(handler, verifyApiKey, { required: true });

export { authedHandler as GET, authedHandler as POST };
