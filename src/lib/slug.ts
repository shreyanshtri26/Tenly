import { randomBytes } from "node:crypto";

// URL-safe organization slug: "Acme Corp" -> "acme-corp-3fa9c1". The random
// suffix keeps slugs unique without a lookup-and-retry loop.
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "org"}-${randomBytes(3).toString("hex")}`;
}
