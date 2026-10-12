"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = { role: "user" | "assistant"; content: string };

// Sends the whole conversation each turn; the server keeps no chat state.
export function Chat({ slug, orgName }: { slug: string; orgName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || pending) return;

    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setDraft("");
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug: slug, messages: next }),
      });
      const data = (await response.json()) as { text?: string; message?: string; error?: string };
      if (!response.ok || !data.text) {
        setError(data.message ?? "The assistant is unavailable right now. Try again in a moment.");
        return;
      }
      setMessages([...next, { role: "assistant", content: data.text }]);
    } catch {
      setError("Could not reach the assistant. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-6 flex flex-col gap-4">
      <div className="min-h-64 space-y-3 rounded-md border p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">Try: &ldquo;How many projects does {orgName} have?&rdquo;</p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={message.role === "user" ? "ml-auto max-w-[80%] rounded-md bg-secondary px-3 py-2" : "max-w-[80%] px-3 py-2"}
          >
            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
          </div>
        ))}
        {pending && <p className="text-sm text-muted-foreground">Thinking…</p>}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about projects, members or usage"
          maxLength={4000}
        />
        <Button type="submit" disabled={pending || draft.trim().length === 0}>
          Send
        </Button>
      </form>
    </section>
  );
}
