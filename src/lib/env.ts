import { z } from "zod";

// All environment variables are validated once, at first import.
// A missing required variable fails fast with a clear message instead of
// surfacing later as an undefined-related crash.
//
// Optional integrations (Upstash, Gmail, Gemini, Groq, Razorpay) degrade
// gracefully when unset so the app still runs locally with only a database.
const schema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32, "Generate one with: openssl rand -base64 32"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PLAN_ID_PRO: z.string().optional(),
  RAZORPAY_PLAN_ID_TEAM: z.string().optional(),

  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  // During `next build` without a .env (for example in CI), use placeholders
  // so the build can finish. Real values are required at runtime.
  const source =
    process.env.SKIP_ENV_VALIDATION === "1"
      ? {
          DATABASE_URL: "postgresql://build:build@localhost:5432/build",
          BETTER_AUTH_SECRET: "build-time-placeholder-secret-0123456789",
          ...process.env,
        }
      : process.env;

  // Blank values (KEY="" in .env) count as unset, so optional URLs don't fail.
  const nonEmpty = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ""));

  const parsed = schema.safeParse(nonEmpty);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}\nSee .env.example.`);
  }
  return parsed.data;
}

export const env = load();
