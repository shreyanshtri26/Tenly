"use client";

import { SubmitButton } from "@/components/submit-button";
import { useState, type FormEvent } from "react";
import type { Role } from "@/generated/prisma/enums";
import { selectClassName } from "@/components/org-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createApiKeyAction } from "../../actions";

// Shows the new key once. The action returns it to this component only; it is
// never stored in the URL or in the page HTML after this view closes.
export function ApiKeyForm({ slug, role }: { slug: string; role: Role }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await createApiKeyAction(slug, {
      name: String(form.get("name") ?? ""),
      role: String(form.get("role")) as "ADMIN" | "MEMBER",
    });
    setPending(false);
    if ("error" in result) return setError(result.error);
    setCreatedKey(result.key);
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
        <Input name="name" placeholder="Key name, e.g. Claude Desktop" required maxLength={60} className="max-w-xs" />
        <select name="role" defaultValue="MEMBER" className={selectClassName}>
          <option value="MEMBER">member</option>
          {role !== "MEMBER" && <option value="ADMIN">admin</option>}
        </select>
        <SubmitButton disabled={pending}>
          {pending ? "Creating…" : "Create key"}
        </SubmitButton>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {createdKey && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium">Copy this key now. You will not see it again.</p>
          <code className="mt-2 block break-all font-mono text-xs">{createdKey}</code>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={async () => {
              await navigator.clipboard.writeText(createdKey);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}
    </div>
  );
}
