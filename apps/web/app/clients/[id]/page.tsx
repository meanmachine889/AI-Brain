"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowUp, Search, Sparkles } from "lucide-react";
import {
  api,
  getToken,
  type Client,
  type SummaryResponse,
  type AskResponse,
} from "@/lib/api";
import { relativeTime, sourceLabel } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Turn = {
  q: string;
  answer?: string;
  sources?: AskResponse["sources"];
  pending: boolean;
};

const SUGGESTIONS = [
  "What are we blocked on?",
  "What's due this week?",
  "Summarize the latest updates",
  "Anything I should be worried about?",
];

function ClientDetailView() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const clientId = params.id;
  const editing = searchParams.get("edit") === "1";

  const [client, setClient] = useState<Client | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([
        api<Client>(`/clients/${clientId}`),
        api<SummaryResponse>(`/clients/${clientId}/summary`),
      ]);
      setClient(c);
      setSummary(s);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, [router, load]);

  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const closeConfig = () => router.replace(`/clients/${clientId}`);

  const submit = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q || asking) return;
      setQuestion("");
      setAsking(true);
      setTurns((t) => [...t, { q, pending: true }]);
      try {
        const res = await api<AskResponse>(`/clients/${clientId}/ask`, {
          method: "POST",
          body: JSON.stringify({ question: q }),
        });
        setTurns((t) =>
          t.map((turn, i) =>
            i === t.length - 1
              ? { ...turn, answer: res.answer, sources: res.sources, pending: false }
              : turn
          )
        );
      } catch (err) {
        setTurns((t) =>
          t.map((turn, i) =>
            i === t.length - 1
              ? { ...turn, answer: "Something went wrong.", pending: false }
              : turn
          )
        );
        toast.error(err instanceof Error ? err.message : "Failed");
      } finally {
        setAsking(false);
      }
    },
    [asking, clientId]
  );

  const empty = turns.length === 0;

  return (
    <AppShell title={client?.name ?? "Client"}>
      <div className="canvas-warm relative flex h-full flex-col">
        {/* scroll area */}
        <div className="flex-1 overflow-y-auto">
          <div
            className={cn(
              "mx-auto flex min-h-full max-w-3xl flex-col px-5 pb-6 pt-10",
              empty && "justify-center"
            )}
          >
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                {/* faded-but-readable status summary */}
                <section id="summary" className="mb-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                    {client?.name} · current status
                    {summary?.refreshing && (
                      <span className="ml-2 normal-case text-link">· refreshing</span>
                    )}
                  </p>
                  <p className="text-[17px] leading-relaxed text-muted-foreground">
                    {summary?.summary ??
                      "No summary yet. Map a source and hit Sync to build this client's picture."}
                  </p>
                  {summary?.generated_at && (
                    <p className="mt-2 text-xs text-muted-foreground/60">
                      Generated {relativeTime(summary.generated_at)} · {summary.chunk_count} items
                    </p>
                  )}
                </section>

                {/* conversation */}
                {turns.map((t, i) => (
                  <div key={i} className="mb-6 space-y-3">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-4 py-2 text-sm text-background shadow-soft">
                        {t.q}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[92%] space-y-3">
                        {t.pending ? (
                          <span className="text-sm text-muted-foreground">Thinking…</span>
                        ) : (
                          <>
                            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                              {t.answer}
                            </p>
                            {t.sources && t.sources.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {t.sources.map((s, j) => (
                                  <span
                                    key={j}
                                    title={s.content_preview}
                                    className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2 py-0.5 text-xs text-muted-foreground shadow-soft"
                                  >
                                    {sourceLabel(s.source)} · {relativeTime(s.source_timestamp)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* ask card — frosted, floating */}
                <div className="relative mt-2">
                  <div className="glow-warm pointer-events-none absolute -inset-x-8 -top-6 -bottom-2 -z-10 blur-2xl" />
                  <div className="overflow-hidden rounded-[24px] border bg-background shadow-float ring-hairline">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        submit(question);
                      }}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Search className="size-4 shrink-0 text-muted-foreground" />
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            submit(question);
                          }
                        }}
                        rows={1}
                        placeholder="Ask anything…"
                        className="max-h-32 flex-1 resize-none bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={asking || !question.trim()}
                        className="size-8 shrink-0 rounded-full"
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                    </form>

                    {empty && (
                      <div className="border-t">
                        {SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => submit(s)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-accent/50"
                          >
                            <Sparkles className="size-4 text-link/80" />
                            <span>{s}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
                    Grounded in {client?.name ?? "client"} activity · may be imperfect
                  </p>
                </div>

                <div ref={endRef} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Configuration modal — opened from the sidebar (?edit=1) */}
      <Dialog open={editing} onOpenChange={(o) => !o && closeConfig()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuration</DialogTitle>
            <DialogDescription>
              Map this client&apos;s sources, then save to refresh its picture.
            </DialogDescription>
          </DialogHeader>
          {client && (
            <EditClientForm
              client={client}
              onSaved={() => {
                closeConfig();
                load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function ClientDetailPage() {
  return (
    <Suspense fallback={null}>
      <ClientDetailView />
    </Suspense>
  );
}

function EditClientForm({
  client,
  onSaved,
}: {
  client: Client;
  onSaved: () => void;
}) {
  const join = (a: string[]) => a.join(", ");
  const split = (s: string) =>
    s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);

  const [name, setName] = useState(client.name);
  const [domain, setDomain] = useState(client.domain ?? "");
  const [contacts, setContacts] = useState(join(client.contact_emails));
  const [channels, setChannels] = useState(join(client.slack_channel_ids));
  const [jiraKeys, setJiraKeys] = useState(join(client.jira_project_keys));
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/clients/${client.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          domain: domain || null,
          contact_emails: split(contacts),
          slack_channel_ids: split(channels),
          jira_project_keys: split(jiraKeys),
        }),
      });
      toast.success("Client updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const fields: [string, string, (v: string) => void, string][] = [
    ["Name", name, setName, ""],
    ["Domain (Gmail match)", domain, setDomain, "acme.com"],
    ["Contact emails", contacts, setContacts, "john@acme.com"],
    ["Slack channel IDs", channels, setChannels, "C012..."],
    ["Jira project keys", jiraKeys, setJiraKeys, "KAN"],
  ];

  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
      {fields.map(([label, value, set, ph]) => (
        <div key={label} className="space-y-1.5">
          <label className="text-xs text-muted-foreground">{label}</label>
          <Input value={value} onChange={(e) => set(e.target.value)} placeholder={ph} />
        </div>
      ))}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
