import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { env } from "@/lib/env";

// Authentication only: who is this user? Authorization (what may they do in
// an organization) is handled by Tenly itself in rbac.ts and session.ts.
// Users live in Neon Auth; session.ts mirrors each one into Tenly's User table.

export const auth = createNeonAuth({
  baseUrl: env.NEON_AUTH_BASE_URL,
  cookies: { secret: env.NEON_AUTH_COOKIE_SECRET },
});
