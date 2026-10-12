import { SubmitButton } from "@/components/submit-button";
import { connection } from "next/server";
import { ErrorNotice, OrgNav } from "@/components/org-nav";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { hasFeature, PLANS } from "@/lib/plans";
import { can } from "@/lib/rbac";
import { requireOrgPage } from "@/lib/session";
import { revokeApiKeyAction } from "../../actions";
import { ApiKeyForm } from "./api-key-form";

export const metadata = { title: "API keys" };

export default async function KeysPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  // Read the request before touching cookies, so the build does not prerender this page.
  await connection();
  const { slug } = await params;
  const { error } = await searchParams;
  const ctx = await requireOrgPage(slug);
  if (!can(ctx.role, "apikey:manage")) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
        <OrgNav slug={slug} />
        <p className="mt-6 text-sm text-muted-foreground">Your role ({ctx.role.toLowerCase()}) cannot view this page.</p>
      </main>
    );
  }

  const keys = await ctx.db.apiKey.findMany({ orderBy: { createdAt: "desc" } });
  const mcpAllowed = hasFeature(ctx.plan, "mcpAccess");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
      <OrgNav slug={slug} />
      <ErrorNotice message={error} />

      {!mcpAllowed && (
        <Card className="mt-6">
          <CardDescription>
            MCP access is part of the Pro and Team plans. You can create keys now, but MCP clients cannot use them on
            the {PLANS[ctx.plan].name} plan.
          </CardDescription>
        </Card>
      )}

      <Card className="mt-6">
        <CardTitle className="text-base">Create a key</CardTitle>
        <CardDescription className="mt-1">
          The full key is shown once. Copy it somewhere safe; Tenly keeps only a hash.
        </CardDescription>
        <div className="mt-4">
          <ApiKeyForm slug={slug} role={ctx.role} />
        </div>
      </Card>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Keys</h2>
        {keys.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No keys yet.</p>
        ) : (
          <ul className="mt-3 divide-y rounded-md border">
            {keys.map((key) => (
              <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    tnly_{key.prefix}_… · {key.role.toLowerCase()} ·{" "}
                    {key.lastUsedAt ? `last used ${key.lastUsedAt.toLocaleDateString()}` : "never used"}
                  </p>
                </div>
                {key.revokedAt ? (
                  <span className="text-xs text-muted-foreground">Revoked</span>
                ) : (
                  <form action={revokeApiKeyAction.bind(null, slug)}>
                    <input type="hidden" name="id" value={key.id} />
                    <SubmitButton variant="ghost" size="sm" className="text-destructive">
                      Revoke
                    </SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
