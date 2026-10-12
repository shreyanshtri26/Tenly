import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";
import { env } from "@/lib/env";

// Free LLM providers, in order of preference. Both have no-card free tiers.
// If the first one fails (rate limit, outage), the assistant retries with the
// next. Keys are only ever read on the server.
//
//   1. Google Gemini (AI Studio free tier) - strong tool calling.
//      Free-tier prompts may be used by Google for training: demo data only.
//   2. Groq (free tier) - open models such as Llama, very fast.

export type NamedModel = { provider: string; model: LanguageModel };

export function availableModels(): NamedModel[] {
  const models: NamedModel[] = [];
  if (env.GEMINI_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
    models.push({ provider: "gemini", model: google(env.GEMINI_MODEL) });
  }
  if (env.GROQ_API_KEY) {
    const groq = createGroq({ apiKey: env.GROQ_API_KEY });
    models.push({ provider: "groq", model: groq(env.GROQ_MODEL) });
  }
  return models;
}
