"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getToken, type AuditEntry, type Client } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { PersonAvatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

const ACTION_LABEL: Record<string, string> = {
  view_client: "opened",
  ask_client: "asked about",
  view_dashboard: "viewed the dashboard",
};

function describe(e: AuditEntry): string {
  const verb = ACTION_LABEL[e.action] ?? e.action;
  if (e.action === "view_dashboard") return `last ${verb}`;
  return `last ${verb} this client`;
}

// Collapse the trail to one row per person — their most recent interaction.
function latestPerActor(entries: AuditEntry[]): AuditEntry[] {
  const latest = new Map<string, AuditEntry>();
  for (const e of entries) {
    const prev = latest.get(e.actor_email);
    if (!prev || new Date(e.created_at) > new Date(prev.created_at)) {
      latest.set(e.actor_email, e);
    }
  }
  return [...latest.values()].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );
}

export default function ClientActivityPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [client, setClient] = useState<Client | null>(null);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    try {
      // client fetch is allowed for any member; activity is owner-only (403 otherwise)
      const c = await api<Client>(`/clients/${id}`);
      setClient(c);
      const a = await api<AuditEntry[]>(
        `/activity?client_id=${encodeURIComponent(id)}`
      ).catch((err) => {
        if (err instanceof Error && /owner/i.test(err.message)) {
          setForbidden(true);
          return [] as AuditEntry[];
        }
        throw err;
      });
      setEntries(a);
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

  return (
    <AppShell title={client?.name ?? "Access log"}>
      <div className="canvas-warm h-full overflow-y-auto">
        <div className="w-full px-6 pb-10 pt-8">
          <PageHeader
            title="Access log"
            description="Each member's most recent access to this client."
          />

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : forbidden ? (
            <p className="text-sm text-muted-foreground">
              Only the agency owner can view the activity trail.
            </p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No access recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-xl bg-card shadow-soft">
              {latestPerActor(entries).map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <PersonAvatar
                    seed={e.actor_email}
                    alt={e.actor_email}
                    className="size-8 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] text-foreground">
                      {e.actor_email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {describe(e)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs tabular-nums text-foreground">
                      {new Date(e.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70">
                      {relativeTime(e.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
