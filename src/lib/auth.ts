import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

// Authentication only: who is this user? Authorization (what may they do in
// an organization) is handled by Tenly itself in rbac.ts and session.ts, so
// the multi-tenancy logic is ours to explain, not a library plugin.

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {},
  // nextCookies lets server actions set auth cookies; keep it last.
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
