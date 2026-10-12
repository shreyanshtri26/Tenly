import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

// One PrismaClient per server instance. In dev, Next.js hot reload re-imports
// this module, so the client is cached on globalThis to avoid exhausting
// Neon's connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma?: InstanceType<typeof PrismaClient>;
};

function createClient() {
  const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type Db = typeof prisma;
