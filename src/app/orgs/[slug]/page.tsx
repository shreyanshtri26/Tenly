import { SubmitButton } from "@/components/submit-button";
import { connection } from "next/server";
import { can } from "@/lib/rbac";
import { requireOrgPage } from "@/lib/session";
import { getUsage, listProjects } from "@/lib/tools";
import { createProjectAction, deleteProjectAction } from "../actions";
import { ErrorNotice, OrgNav } from "@/components/org-nav";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function OrgOverviewPage({
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

  const [projects, usage] = await Promise.all([
    listProjects.execute(ctx, { limit: 50 }),
    getUsage.execute(ctx, {}),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{ctx.orgName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {usage.plan} plan · You are {ctx.role.toLowerCase()}
      </p>
      <OrgNav slug={slug} />
      <ErrorNotice message={error} />

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {usage.usage.map((item) => (
          <Card key={item.metric}>
            <CardTitle className="text-sm capitalize">{item.metric.replace("_", " ")}</CardTitle>
            <CardDescription className="mt-2 text-2xl font-semibold text-foreground">
              {item.used} <span className="text-sm font-normal text-muted-foreground">of {item.limit}</span>
            </CardDescription>
            {item.state !== "ok" && (
              <p className={`mt-2 text-xs ${item.state === "hard" ? "text-destructive" : "text-amber-600"}`}>
                {item.state === "hard" ? "Limit reached" : "Close to the limit"}
              </p>
            )}
          </Card>
        ))}
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_280px]">
        <div>
          <h2 className="text-lg font-semibold">Projects</h2>
          {projects.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <ul className="mt-3 divide-y rounded-md border">
              {projects.map((project) => (
                <li key={project.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="font-medium">{project.name}</p>
                    {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
                  </div>
                  {can(ctx.role, "project:delete") && (
                    <form action={deleteProjectAction.bind(null, slug)}>
                      <input type="hidden" name="id" value={project.id} />
                      <SubmitButton variant="ghost" size="sm" className="text-destructive">
                        Delete
                      </SubmitButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {can(ctx.role, "project:create") && (
          <Card>
            <CardTitle className="text-base">New project</CardTitle>
            <form action={createProjectAction.bind(null, slug)} className="mt-4 space-y-3">
              <Input name="name" placeholder="Project name" required maxLength={80} />
              <Input name="description" placeholder="Description (optional)" maxLength={500} />
              <SubmitButton className="w-full">
                Create project
              </SubmitButton>
            </form>
          </Card>
        )}
      </section>
    </main>
  );
}
