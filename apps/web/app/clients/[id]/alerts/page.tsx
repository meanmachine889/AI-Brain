"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Clock } from "lucide-react";
import { api, getToken, type Alert, type Client } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { PROVIDER_ICON } from "@/components/brand-icons";
import { Skeleton } from "@/components/ui/skeleton";

// Where an alert came from: ticket rules are Jira-born and get the brand
// mark; silence/blocked are cross-source signals and get a neutral glyph.
function AlertIcon({ type }: { type: string }) {
  if (type === "ticket_stale" || type === "deadline_approaching") {
    const Jira = PROVIDER_ICON.jira;
    return <Jira className="size-4" />;
  }
  if (type === "client_silent") {
    return <Clock className="size-4 text-muted-foreground" />;
  }
  return <AlertCircle className="size-4 text-muted-foreground" />;
}

export default function ClientAlertsPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [client, setClient] = useState<Client | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([
        api<Client>(`/clients/${id}`),
        api<Alert[]>("/dashboard/alerts").catch(() => []),
      ]);
      setClient(c);
      setAlerts(a.filter((x) => x.client_id === id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, [router, load]);

  async function resolve(alertId: string) {
    setAlerts((a) => a.filter((x) => x.id !== alertId));
    try {
      await api(`/alerts/${alertId}/resolve`, { method: "PATCH" });
    } catch {
      load();
    }
  }

  return (
    <AppShell title={client?.name ?? "Attention"}>
      <div className="canvas-warm h-full overflow-y-auto">
        <div className="w-full px-6 pb-10 pt-8">
          <PageHeader
            title="Attention"
            description="Open alerts for this client — resolve them as they're handled."
          />

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts. All clear.</p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-xl bg-card shadow-soft">
              {alerts.map((a) => (
                <li key={a.id} className="flex gap-3 px-4 py-3.5">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center">
                    <AlertIcon type={a.type} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] leading-relaxed text-foreground">
                      {a.message}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.severity}
                      {typeof a.metadata?.ticket_key === "string" && (
                        <> · <span className="mono">{a.metadata.ticket_key}</span></>
                      )}
                      {" · "}
                      {relativeTime(a.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => resolve(a.id)}
                    className="shrink-0 self-start pt-0.5 text-xs text-muted-foreground transition hover:text-foreground"
                  >
                    Resolve
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
