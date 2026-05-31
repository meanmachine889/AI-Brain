"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  api,
  getToken,
  type Client,
  type SummaryResponse,
  type AskResponse,
} from "@/lib/api";
import { relativeTime, sourceLabel } from "@/lib/format";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [client, setClient] = useState<Client | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // ask bar
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<AskResponse | null>(null);

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

  async function sync() {
    setSyncing(true);
    try {
      await api("/integrations/slack/sync", { method: "POST" });
      toast.success("Sync started — summary will refresh shortly");
      // give the worker a few seconds, then reload the summary
      setTimeout(load, 5000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSyncing(false);
    }
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const res = await api<AskResponse>(`/clients/${clientId}/ask`, {
        method: "POST",
        body: JSON.stringify({ question }),
      });
      setAnswer(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setAsking(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to dashboard
        </Link>

        {loading ? (
          <Skeleton className="h-40" />
        ) : !client ? (
          <p className="text-sm text-muted-foreground">Client not found.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">{client.name}</h1>
                {client.domain && (
                  <p className="text-sm text-muted-foreground">
                    {client.domain}
                  </p>
                )}
              </div>
              <Button onClick={sync} disabled={syncing} variant="outline">
                {syncing ? "Syncing..." : "Sync now"}
              </Button>
            </div>

            {/* Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Status summary</CardTitle>
                  {summary?.refreshing && (
                    <Badge variant="secondary">refreshing…</Badge>
                  )}
                </div>
                {summary?.generated_at && (
                  <CardDescription>
                    Generated {relativeTime(summary.generated_at)} ·{" "}
                    {summary.chunk_count} items
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  {summary?.summary ??
                    "No summary yet. Connect Slack, then click Sync now."}
                </p>
              </CardContent>
            </Card>

            {/* Ask bar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ask about {client.name}</CardTitle>
                <CardDescription>
                  Answers are grounded in this client&apos;s recent activity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={ask} className="space-y-2">
                  <Textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. What are we blocked on? What's due Friday?"
                    rows={2}
                  />
                  <Button type="submit" disabled={asking || !question.trim()}>
                    {asking ? "Thinking..." : "Ask"}
                  </Button>
                </form>

                {answer && (
                  <div className="space-y-3 pt-2">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {answer.answer}
                    </p>
                    {answer.sources.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Sources
                        </p>
                        {answer.sources.map((s, i) => (
                          <div
                            key={i}
                            className="rounded-md border bg-muted/40 p-2 text-xs"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">
                                {sourceLabel(s.source)}
                              </Badge>
                              <span className="text-muted-foreground">
                                {relativeTime(s.source_timestamp)}
                              </span>
                            </div>
                            <p className="text-muted-foreground">
                              {s.content_preview}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </>
  );
}
