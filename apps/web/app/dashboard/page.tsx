"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  api,
  getToken,
  type Dashboard,
  type Alert,
} from "@/lib/api";
import { relativeTime, scoreColor, severityVariant } from "@/lib/format";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, a] = await Promise.all([
        api<Dashboard>("/dashboard"),
        api<Alert[]>("/dashboard/alerts"),
      ]);
      setData(d);
      setAlerts(a);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, [router, load]);

  async function resolveAlert(id: string) {
    try {
      await api(`/alerts/${id}/resolve`, { method: "PATCH" });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Alert resolved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl w-full px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {data ? `${data.clients.length} clients` : "Loading..."}
              {data && data.total_alerts > 0
                ? ` · ${data.total_alerts} open alerts`
                : ""}
            </p>
          </div>
          <Button onClick={() => setShowAdd((s) => !s)}>
            {showAdd ? "Cancel" : "Add client"}
          </Button>
        </div>

        {showAdd && (
          <AddClientForm
            onCreated={() => {
              setShowAdd(false);
              load();
            }}
          />
        )}

        {/* Attention feed */}
        {alerts.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Needs attention
            </h2>
            <div className="space-y-2">
              {alerts.map((a) => (
                <Card key={a.id} className="py-0">
                  <CardContent className="flex items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant={severityVariant(a.severity)}>
                        {a.severity}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {a.client_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {a.message}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveAlert(a.id)}
                    >
                      Resolve
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Client cards */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Clients</h2>
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <Skeleton className="h-36" />
              <Skeleton className="h-36" />
            </div>
          ) : !data || data.clients.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No clients yet. Click <b>Add client</b> to create one, then
                connect Slack from Integrations.
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {data.clients.map((c) => (
                <Link key={c.id} href={`/clients/${c.id}`}>
                  <Card className="h-full transition-colors hover:border-foreground/30">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{c.name}</CardTitle>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${scoreColor(
                            c.attention_score
                          )}`}
                        >
                          {c.attention_score}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {c.summary ?? "No summary yet — connect Slack & sync."}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{relativeTime(c.last_activity_at)}</span>
                        {c.alert_count > 0 && (
                          <Badge variant="destructive">
                            {c.alert_count} alert
                            {c.alert_count > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function AddClientForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [channels, setChannels] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const slack_channel_ids = channels
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await api("/clients", {
        method: "POST",
        body: JSON.stringify({
          name,
          domain: domain || null,
          slack_channel_ids,
        }),
      });
      toast.success("Client created");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Client name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Domain (optional)
            </label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="acme.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Slack channel IDs
            </label>
            <Input
              value={channels}
              onChange={(e) => setChannels(e.target.value)}
              placeholder="C012..., C034..."
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create client"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
