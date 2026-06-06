"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getToken, type Alert, type Client } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

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
        <div className="mx-auto max-w-3xl px-5 pb-10 pt-10">
          <h1 className="mb-6 text-xl font-semibold">Alerts</h1>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts. All clear.</p>
          ) : (
            <ul className="space-y-5">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-4">
                  <div>
                    <p className="text-[15px] leading-relaxed text-foreground">
                      {a.message}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.severity} · {relativeTime(a.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => resolve(a.id)}
                    className="shrink-0 text-xs text-muted-foreground transition hover:text-foreground"
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
