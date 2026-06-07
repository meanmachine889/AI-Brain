"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  api,
  type Principal,
  type Client,
  type Dashboard,
  type DashboardClient,
  type Integration,
  type SummaryResponse,
} from "@/lib/api";
import type { Provider } from "@/components/brand-icons";

type WorkspaceValue = {
  me: Principal | null;
  clients: Client[];
  scores: Record<string, DashboardClient>;
  connected: Set<Provider>;
  loading: boolean;
  syncing: boolean;
  activeId: string | undefined;
  activeClient: Client | null;
  load: () => Promise<void>;
  sync: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within <WorkspaceProvider>");
  return ctx;
}

// Module-level cache so the shell survives route changes. Each page mounts its
// own <AppShell>, so navigation remounts this provider — without a cache that
// meant a full refetch + skeleton flash on every sidebar click. We seed state
// from the cache (no flash) and revalidate quietly in the background.
type Snapshot = {
  me: Principal | null;
  clients: Client[];
  scores: Record<string, DashboardClient>;
  connected: Provider[];
};
let cache: Snapshot | null = null;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const params = useParams<{ id?: string }>();
  const activeId = params?.id;

  const [me, setMe] = useState<Principal | null>(cache?.me ?? null);
  const [clients, setClients] = useState<Client[]>(cache?.clients ?? []);
  const [scores, setScores] = useState<Record<string, DashboardClient>>(
    cache?.scores ?? {},
  );
  const [connected, setConnected] = useState<Set<Provider>>(
    new Set(cache?.connected ?? []),
  );
  const [loading, setLoading] = useState(!cache);
  const [syncing, setSyncing] = useState(false);

  const activeClient = clients.find((c) => c.id === activeId) ?? null;

  const load = useCallback(async () => {
    try {
      const [meRes, list, dash, integrations] = await Promise.all([
        api<Principal>("/auth/me"),
        api<Client[]>("/clients"),
        api<Dashboard>("/dashboard").catch(() => null),
        api<Integration[]>("/integrations").catch(() => [] as Integration[]),
      ]);
      const scoreMap: Record<string, DashboardClient> = {};
      if (dash) for (const dc of dash.clients) scoreMap[dc.id] = dc;
      const conn = integrations.map((i) => i.provider as Provider);

      setMe(meRes);
      setClients(list);
      setScores(scoreMap);
      setConnected(new Set(conn));
      cache = { me: meRes, clients: list, scores: scoreMap, connected: conn };
    } catch {
      // 401 handling lives in api()
    } finally {
      setLoading(false);
    }
  }, []);

  // Always revalidate on mount; loading only flips true when there's no cache.
  useEffect(() => {
    load();
  }, [load]);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    const id = activeId;
    try {
      // POST returns immediately while the worker ingests + re-summarizes in the
      // background. Capture the active client's summary `generated_at` now, then
      // poll until it changes so the spinner reflects real progress.
      const baseline = id
        ? await api<SummaryResponse>(`/clients/${id}/summary`)
            .then((s) => s.generated_at)
            .catch(() => null)
        : null;

      await api("/integrations/sync", { method: "POST" });
      toast.info("Syncing sources…");

      let updated = false;
      const deadline = Date.now() + 90_000;
      while (id && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 3000));
        const gen = await api<SummaryResponse>(`/clients/${id}/summary`)
          .then((s) => s.generated_at)
          .catch(() => null);
        if (gen && gen !== baseline) {
          updated = true;
          break;
        }
      }

      await load();
      window.dispatchEvent(new CustomEvent("sources-synced"));
      toast.success(
        updated ? "Sources updated" : "Sync running — data will appear shortly",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [syncing, activeId, load]);

  return (
    <WorkspaceContext.Provider
      value={{
        me,
        clients,
        scores,
        connected,
        loading,
        syncing,
        activeId,
        activeClient,
        load,
        sync,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

// attention severity → dot color (emerald calm · slate watch · crimson hot)
export function scoreDot(score: number): string {
  if (score >= 60) return "bg-crimson";
  if (score >= 30) return "bg-slate";
  return "bg-emerald";
}
