import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { RateLimitedError } from "@/lib/errors";

// Rate limiting protects the free LLM quota and the MCP endpoint.
// Upstash Redis (free tier, no card) holds the counters so limits hold across
// every serverless instance. Without Upstash configured, limits are skipped
// and a warning is logged, which keeps local development simple.

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;

const limiters = redis
  ? {
      // Sliding window: smoother than fixed windows at the boundary.
      assistant: new Ratelimit({ redis, prefix: "rl:assistant", limiter: Ratelimit.slidingWindow(10, "1 m") }),
      mcp: new Ratelimit({ redis, prefix: "rl:mcp", limiter: Ratelimit.slidingWindow(60, "1 m") }),
    }
  : null;

export type LimiterName = "assistant" | "mcp";

export async function enforceRateLimit(name: LimiterName, identifier: string): Promise<void> {
  if (!limiters) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[ratelimit] Upstash not configured; "${name}" is unlimited`);
    }
    return;
  }
  const { success } = await limiters[name].limit(identifier);
  if (!success) throw new RateLimitedError();
}
