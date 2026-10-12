// Grants or revokes the platform super admin flag.
//   pnpm admin:grant you@example.com
//   pnpm admin:grant you@example.com --revoke
// The user must have signed in at least once so their row exists.
import { neon } from "@neondatabase/serverless";

const [email, flag] = process.argv.slice(2);
if (!email) {
  console.error("usage: pnpm admin:grant <email> [--revoke]");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Run with: node --env-file=.env scripts/grant-super-admin.mjs");
  process.exit(1);
}

const value = flag !== "--revoke";
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  update "user" set "isSuperAdmin" = ${value}
  where lower(email) = lower(${email})
  returning email, "isSuperAdmin"
`;
if (rows.length === 0) {
  console.error(`No user with email ${email}. Sign in once in the app first, then run this again.`);
  process.exit(1);
}
console.log(`${rows[0].email}: super admin = ${rows[0].isSuperAdmin}`);
