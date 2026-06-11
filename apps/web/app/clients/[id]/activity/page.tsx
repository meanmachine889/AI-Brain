"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getToken, type AuditEntry, type Client } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

const ACTION_LABEL: Record<string, string> = {
  view_client: "opened",
  ask_client: "asked about",
  view_dashboard: "viewed the dashboard",
};

function describe(e: AuditEntry): string {
  const verb = ACTION_LABEL[e.action] ?? e.action;
  if (e.action === "view_dashboard") return `${e.actor_email} ${verb}`;
  return `${e.actor_email} ${verb} this client`;
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
    <AppShell title={client?.name ?? "Activity"}>
      <div className="canvas-warm h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-5 pb-10 pt-10">
          <h1 className="text-xl font-semibold">Activity</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            Who accessed this client&apos;s data, and when.
          </p>

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
            <ul className="space-y-5">
              {entries.map((e) => {
                const question =
                  e.action === "ask_client" && typeof e.metadata?.question === "string"
                    ? (e.metadata.question as string)
                    : null;
                return (
                  <li key={e.id} className="flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[15px] leading-relaxed text-foreground">
                        {describe(e)}
                      </p>
                      {question && (
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          &ldquo;{question}&rdquo;
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {relativeTime(e.created_at)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
