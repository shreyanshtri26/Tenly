import { prisma } from "@/lib/db";

// Liveness and database check, used by uptime monitors and the CI smoke test.
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "ok", latencyMs: Date.now() - startedAt });
  } catch {
    return Response.json({ status: "degraded", db: "unreachable" }, { status: 503 });
  }
}
