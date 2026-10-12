import { generateText, stepCountIs, tool, type ToolSet } from "ai";
import { z } from "zod";
import { AppError, toHttpResponse } from "@/lib/errors";
import { availableModels } from "@/lib/llm";
import { enforceRateLimit } from "@/lib/ratelimit";
import { requireOrgContext, type OrgContext } from "@/lib/session";
import { TOOLS } from "@/lib/tools";
import { assertWithinLimit, incrementDaily } from "@/lib/usage";

// "Ask Tenly": an in-app assistant that uses the SAME tools as the MCP server.
// It lets a visitor see MCP-style tool calling work without installing an
// MCP client.
//
// Cost control on free LLM tiers:
//  - per-user rate limit (Upstash) and a per-org daily plan limit,
//  - at most 5 model steps per question,
//  - provider fallback: Gemini first, then Groq.

const body = z.object({
  orgSlug: z.string().min(1),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4_000) }))
    .min(1)
    .max(20),
});

function toolsFor(ctx: OrgContext): ToolSet {
  return Object.fromEntries(
    TOOLS.map((t) => [
      t.name,
      tool({
        description: t.description,
        inputSchema: t.input,
        execute: async (input: unknown) => {
          try {
            return await t.execute(ctx, input);
          } catch (error) {
            // Return errors to the model as data so it can explain them,
            // instead of crashing the whole conversation.
            return { error: error instanceof AppError ? error.message : "Tool failed" };
          }
        },
      }),
    ]),
  );
}

export async function POST(request: Request) {
  try {
    const parsed = body.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
    }
    const { orgSlug, messages } = parsed.data;

    const ctx = await requireOrgContext(orgSlug);
    await enforceRateLimit("assistant", ctx.userId);
    await assertWithinLimit(ctx.db, ctx.plan, "assistant_messages");

    const models = availableModels();
    if (models.length === 0) {
      return Response.json(
        { error: "assistant_not_configured", message: "Set GEMINI_API_KEY or GROQ_API_KEY" },
        { status: 503 },
      );
    }

    const system =
      `You are Tenly's assistant for the organization "${ctx.orgName}". ` +
      `The user's role is ${ctx.role}. Use the tools to answer; never invent data. ` +
      "Before calling a tool that changes data, confirm the details with the user in one short question.";

    let lastError: unknown;
    for (const { provider, model } of models) {
      try {
        const result = await generateText({
          model,
          system,
          messages,
          tools: toolsFor(ctx),
          stopWhen: stepCountIs(5),
        });
        await incrementDaily(ctx.db, ctx.orgId, "assistant_messages");
        return Response.json({ provider, text: result.text });
      } catch (error) {
        lastError = error;
        console.warn(`[assistant] ${provider} failed, trying next provider`, error);
      }
    }
    console.error("[assistant] all providers failed", lastError);
    return Response.json({ error: "assistant_unavailable" }, { status: 502 });
  } catch (error) {
    return toHttpResponse(error);
  }
}
