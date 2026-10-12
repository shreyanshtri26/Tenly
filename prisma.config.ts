import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI config (migrations, generate, studio).
//
// DIRECT_URL is Neon's non-pooled connection string, which migrations need.
// The running app uses DATABASE_URL (pooled) through the Neon driver adapter.
//
// `prisma generate` runs on every `pnpm install` (postinstall) and does not
// need a database, so a missing DIRECT_URL falls back to an empty string
// instead of failing the install. Migration commands still require it.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});
