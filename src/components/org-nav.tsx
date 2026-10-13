import Link from "next/link";
import type { Role } from "@/generated/prisma/enums";
import { can, type Permission } from "@/lib/rbac";

// Each link is shown only if the role can use its page. The pages still check
// permissions themselves; this only keeps members from seeing dead links.
const LINKS: ReadonlyArray<readonly [string, string, Permission | null]> = [
  ["", "Overview", null],
  ["/members", "Members", "member:read"],
  ["/billing", "Billing", "billing:read"],
  ["/keys", "API keys", "apikey:manage"],
  ["/audit", "Audit log", "audit:read"],
  ["/assistant", "Ask Tenly", null],
];

export function OrgNav({ slug, role }: { slug: string; role: Role }) {
  return (
    <nav className="mt-4 flex flex-wrap gap-1 text-sm">
      {LINKS.filter(([, , permission]) => !permission || can(role, permission)).map(([path, label]) => (
        <Link
          key={label}
          href={`/orgs/${slug}${path}`}
          className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function ErrorNotice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

export const selectClassName = "h-9 rounded-md border border-input bg-transparent px-2 text-sm";
