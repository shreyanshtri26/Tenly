import Link from "next/link";

const LINKS = [
  ["", "Overview"],
  ["/members", "Members"],
  ["/billing", "Billing"],
  ["/keys", "API keys"],
  ["/audit", "Audit log"],
  ["/assistant", "Ask Tenly"],
] as const;

export function OrgNav({ slug }: { slug: string }) {
  return (
    <nav className="mt-4 flex flex-wrap gap-1 text-sm">
      {LINKS.map(([path, label]) => (
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
