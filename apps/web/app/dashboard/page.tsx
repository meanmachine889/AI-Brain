"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  AlertCircle, 
  MessageSquare, 
  Mail, 
  Plus, 
  ChevronRight, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Briefcase, 
  Layers, 
  Settings2,
  Trash2,
  Users
} from "lucide-react";
import { api, getToken, type Client, type Alert } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/components/app-data";
import { ClientAvatar } from "@/components/avatar";
import { relativeTime, sourceLabel } from "@/lib/format";
import { PROVIDER_ICON, PROVIDER_LABEL } from "@/components/brand-icons";
import { cn } from "@/lib/utils";

function DashboardContent() {
  const router = useRouter();
  const { me, clients, scores, connected, loading, syncing, load, sync } = useWorkspace();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  // Add client form state
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [channels, setChannels] = useState("");
  const [jiraKeys, setJiraKeys] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAlerts = useCallback(async () => {
    try {
      const list = await api<Alert[]>("/dashboard/alerts?resolved=false");
      setAlerts(list);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
    loadAlerts();
  }, [router, load, loadAlerts]);

  // Handle active alert resolution
  async function resolveAlert(alertId: string) {
    try {
      await api(`/alerts/${alertId}/resolve`, { method: "PATCH" });
      toast.success("Alert resolved");
      await Promise.all([loadAlerts(), load()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve alert");
    }
  }

  // Handle client creation
  const split = (s: string) =>
    s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const c = await api<Client>("/clients", {
        method: "POST",
        body: JSON.stringify({
          name,
          domain: domain || null,
          slack_channel_ids: split(channels),
          jira_project_keys: split(jiraKeys),
        }),
      });
      toast.success("Client created");
      setName("");
      setDomain("");
      setChannels("");
      setJiraKeys("");
      await Promise.all([load(), loadAlerts()]);
      router.push(`/clients/${c.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setSaving(false);
    }
  }

  // Conditional attention badge classes
  function attentionBadge(score: number) {
    if (score >= 60) return "bg-red-500/10 text-crimson border-red-500/25";
    if (score >= 30) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/25";
    return "bg-emerald/10 text-emerald border-emerald/25";
  }

  return (
    <div className="canvas-warm relative flex h-full flex-col overflow-y-auto px-6 py-8">
        <div className="mx-auto w-full max-w-6xl space-y-8">
          
          {/* Header & Main Workspace Overview Metrics */}
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Workspace Overview</h1>
              <p className="text-xs text-muted-foreground">Aggregated digital intelligence across all client workspaces.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Stat 1: Total Clients */}
              <div className="glass-card rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active Clients</p>
                  {loading ? (
                    <Skeleton className="mt-1 h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground mt-0.5">{clients.length}</p>
                  )}
                </div>
                <div className="size-8 rounded-lg bg-indigo/10 text-indigo flex items-center justify-center">
                  <Briefcase className="size-4" />
                </div>
              </div>

              {/* Stat 2: Active Alerts */}
              <div className="glass-card rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Unresolved Alerts</p>
                  {loadingAlerts ? (
                    <Skeleton className="mt-1 h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground mt-0.5">{alerts.length}</p>
                  )}
                </div>
                <div className="size-8 rounded-lg bg-crimson/10 text-crimson flex items-center justify-center">
                  <AlertCircle className="size-4" />
                </div>
              </div>

              {/* Stat 3: Connected Integrations */}
              <div className="glass-card rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Connected Integrations</p>
                  {loading ? (
                    <Skeleton className="mt-1 h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground mt-0.5">{connected.size}</p>
                  )}
                </div>
                <div className="size-8 rounded-lg bg-emerald/10 text-emerald flex items-center justify-center">
                  <Layers className="size-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Grid Layout: Clients (Left) vs Side Panel (Right) */}
          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* Left side: Clients Registry */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-tight text-foreground uppercase">Managed Client Spaces</h2>
                {clients.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={sync}
                    disabled={syncing}
                    className="h-8 gap-1.5 text-xs text-muted-foreground"
                  >
                    <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
                    Sync All
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="glass-card rounded-xl p-5 space-y-3">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : clients.length === 0 ? (
                <div className="glass-card rounded-xl p-10 text-center space-y-3">
                  <div className="mx-auto size-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground/60">
                    <Briefcase className="size-5" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground">No client spaces created</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Get started by adding your first client registry using the form on the right. Once created, you can map channels, projects, and domains.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {clients
                    .map((c) => ({
                      client: c,
                      score: scores[c.id]?.attention_score ?? 0,
                      summary: scores[c.id]?.summary ?? null,
                      last_activity: scores[c.id]?.last_activity_at ?? null,
                      alert_count: scores[c.id]?.alert_count ?? 0,
                    }))
                    .sort((a, b) => b.score - a.score)
                    .map(({ client, score, summary, last_activity, alert_count }) => (
                      <div 
                        key={client.id}
                        className="glass-card rounded-xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors"
                      >
                        <div className="space-y-3">
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <ClientAvatar name={client.name} className="size-6 shrink-0 rounded-md" />
                              <div className="min-w-0">
                                <h3 className="text-xs font-semibold text-foreground truncate">{client.name}</h3>
                                {client.domain && (
                                  <p className="text-[10px] text-muted-foreground font-mono truncate">{client.domain}</p>
                                )}
                              </div>
                            </div>
                            <span className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide",
                              attentionBadge(score)
                            )}>
                              {score}
                            </span>
                          </div>

                          {/* Summary Preview */}
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                            {summary || "No summary generated yet. Connect integrations and click sync."}
                          </p>
                        </div>

                        {/* Card Footer */}
                        <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-muted-foreground">
                          {/* Connected sources indicators */}
                          <div className="flex items-center gap-2">
                            {client.slack_channel_ids?.length > 0 && (
                              <span title="Slack Connected" className="text-indigo">
                                <MessageSquare className="size-3.5" />
                              </span>
                            )}
                            {client.domain && (
                              <span title="Gmail Domain Configured" className="text-red-400">
                                <Mail className="size-3.5" />
                              </span>
                            )}
                            {client.jira_project_keys?.length > 0 && (
                              <span title="Jira Tracked" className="text-blue-400">
                                <RefreshCw className="size-3.5" />
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {relativeTime(last_activity)}
                            </span>
                            <Link 
                              href={`/clients/${client.id}`}
                              className="inline-flex items-center gap-0.5 font-medium text-foreground hover:text-indigo transition-colors"
                            >
                              Open <ChevronRight className="size-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Right side: Add Client Card & Attention Feed */}
            <div className="space-y-6">
              
              {/* Add Client Card Form */}
              <div className="glass-card rounded-xl p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-foreground uppercase flex items-center gap-1.5">
                    <Plus className="size-4 text-muted-foreground" /> Add Client Workspace
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Map communication flows and build this client&apos;s brain.</p>
                </div>

                <form onSubmit={createClient} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Client name</label>
                    <Input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="e.g. Acme Corp" 
                      className="h-8 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Email Domain (optional)</label>
                    <Input 
                      value={domain} 
                      onChange={(e) => setDomain(e.target.value)} 
                      placeholder="e.g. acme.com" 
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Slack Channel IDs (optional)</label>
                    <Input 
                      value={channels} 
                      onChange={(e) => setChannels(e.target.value)} 
                      placeholder="e.g. C012345, C67890" 
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-muted-foreground">Jira Project Keys (optional)</label>
                    <Input 
                      value={jiraKeys} 
                      onChange={(e) => setJiraKeys(e.target.value)} 
                      placeholder="e.g. KAN, PROJ" 
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={saving || !name.trim()} 
                    className="w-full h-8 text-xs font-medium mt-1 cta-lime"
                  >
                    {saving ? "Creating..." : "Create workspace"}
                  </Button>
                </form>
              </div>

              {/* Unresolved Alerts Stream Panel */}
              <div className="glass-card rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                  <h2 className="text-sm font-semibold tracking-tight text-foreground uppercase flex items-center gap-1.5">
                    <AlertCircle className="size-4 text-crimson" /> Active Attention Items
                  </h2>
                  {!loadingAlerts && alerts.length > 0 && (
                    <span className="rounded-full bg-crimson/15 px-2 py-0.5 text-[10px] font-semibold text-crimson">
                      {alerts.length}
                    </span>
                  )}
                </div>

                {loadingAlerts ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground space-y-1.5">
                    <CheckCircle2 className="size-6 text-emerald/60 mx-auto" />
                    <p className="text-xs font-medium text-foreground">All clients are silent and moving</p>
                    <p className="text-[10.5px]">No active blocks, overdue tickets or stale integrations detected.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 no-scrollbar">
                    {alerts.map((alert) => (
                      <div 
                        key={alert.id}
                        className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-2 relative group hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="space-y-0.5">
                            <span className="text-[9.5px] font-semibold text-indigo uppercase">{alert.client_name}</span>
                            <p className="text-xs text-foreground font-medium leading-snug">{alert.message}</p>
                          </div>
                          <button
                            onClick={() => resolveAlert(alert.id)}
                            className="size-5 rounded-md border border-white/10 flex items-center justify-center text-muted-foreground hover:text-emerald hover:border-emerald/50 transition-colors"
                            title="Resolve alert"
                          >
                            <CheckCircle2 className="size-3" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                          <span className={cn(
                            "capitalize font-medium",
                            alert.severity === "high" && "text-crimson",
                            alert.severity === "medium" && "text-yellow-500",
                            alert.severity === "low" && "text-slate"
                          )}>
                            {alert.severity} priority
                          </span>
                          <span>{relativeTime(alert.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      <DashboardContent />
    </AppShell>
  );
}
