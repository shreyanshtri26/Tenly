import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { listUserOrgs } from "@/lib/session";

// The signed-in user's organizations, with their role and plan in each.
// Native <details>, so it opens without any client JavaScript.
export async function OrgMenu({ userId }: { userId: string }) {
  const memberships = await listUserOrgs(userId);
  if (memberships.length === 0) return null;

  const first = memberships[0];
  const label = (role: string, plan: keyof typeof PLANS) => `${role.toLowerCase()} · ${PLANS[plan].name}`;

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
        <span className="max-w-32 truncate text-foreground">{first.org.name}</span>
        <span className="hidden rounded-full border border-primary/30 px-2 py-0.5 text-xs text-primary sm:inline">
          {label(first.role, first.org.plan)}
        </span>
        {memberships.length > 1 && <span className="text-xs">+{memberships.length - 1}</span>}
      </summary>
      <ul className="absolute right-0 z-50 mt-2 w-72 space-y-1 rounded-md border border-border bg-card p-2 shadow-2xl shadow-black/40">
        {memberships.map(({ org, role }) => (
          <li key={org.id}>
            <Link href={`/orgs/${org.slug}`} className="flex items-center justify-between gap-3 rounded px-2 py-2 hover:bg-secondary">
              <span className="truncate text-sm">{org.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{label(role, org.plan)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
