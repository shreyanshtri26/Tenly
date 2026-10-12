"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";

type Message = { role: "user" | "assistant"; content: string };

// Sends the whole conversation each turn; the server keeps no chat state.
// The answer is read as it streams in, so the first words appear right away.
export function Chat({ slug, orgName }: { slug: string; orgName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as text arrives.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

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
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? "The assistant is unavailable right now. Try again in a moment.");
        return;
      }

      // Add an empty assistant bubble, then fill it as each piece arrives.
      setMessages([...next, { role: "assistant", content: "" }]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + text };
          return copy;
        });
      }
    } catch {
      setError("Could not reach the assistant. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-6 flex flex-col gap-4">
      <div className="min-h-64 max-h-[60vh] space-y-3 overflow-y-auto rounded-md border p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">Try: &ldquo;How many projects does {orgName} have?&rdquo;</p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={message.role === "user" ? "ml-auto max-w-[80%] rounded-md bg-secondary px-3 py-2" : "max-w-[80%] px-3 py-2"}
          >
            <p className="whitespace-pre-wrap text-sm">
              {message.content || (pending && index === messages.length - 1 ? "…" : "")}
            </p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about projects, members or usage"
          maxLength={4000}
        />
        <SubmitButton pendingText="Sending…" disabled={pending || draft.trim().length === 0}>
          Send
        </SubmitButton>
      </form>
    </section>
  );
}
