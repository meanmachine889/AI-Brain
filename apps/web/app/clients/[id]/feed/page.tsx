"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  api,
  getToken,
  type FeedItem,
  type FeedRange,
  type FeedResponse,
} from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { PROVIDER_ICON, PROVIDER_LABEL } from "@/components/brand-icons";
import { cn } from "@/lib/utils";

const RANGES: { id: FeedRange; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
];

function RangeSwitch({
  value,
  onChange,
}: {
  value: FeedRange;
  onChange: (r: FeedRange) => void;
}) {
  return (
    <div className="flex shrink-0 rounded-lg bg-muted p-0.5">
      {RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={cn(
            "h-7 rounded-md px-3 text-[12px] transition-colors",
            value === r.id
              ? "nav-active font-[510] text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

// One quiet metadata line per source — the details content alone doesn't show.
function metaLine(item: FeedItem): string | null {
  const md = item.metadata ?? {};
  const parts: string[] = [];
  if (item.source === "jira") {
    if (md.status) parts.push(String(md.status));
    if (md.assignee) parts.push(String(md.assignee));
    if (md.due_date) parts.push(`due ${md.due_date}`);
  } else if (item.source === "gmail") {
    if (md.from) parts.push(String(md.from));
    if (md.subject) parts.push(String(md.subject));
  } else if (item.source === "slack") {
    if (md.channel_name || md.channel_id)
      parts.push(`#${md.channel_name ?? md.channel_id}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Group (already newest-first) items by calendar day.
function groupByDay(items: FeedItem[]): [string, FeedItem[]][] {
  const groups: [string, FeedItem[]][] = [];
  for (const item of items) {
    const label = item.source_timestamp
      ? dayLabel(item.source_timestamp)
      : "Undated";
    const last = groups[groups.length - 1];
    if (last && last[0] === label) last[1].push(item);
    else groups.push([label, [item]]);
  }
  return groups;
}

export default function ClientFeedPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [range, setRange] = useState<FeedRange>("week");
  // cache per range so switching back doesn't flash a skeleton; "no entry"
  // doubles as the loading flag, so there's no separate loading state
  const [byRange, setByRange] = useState<Partial<Record<FeedRange, FeedItem[]>>>({});

  const load = useCallback(
    async (r: FeedRange) => {
      try {
        const res = await api<FeedResponse>(`/clients/${id}/feed?range=${r}`);
        setByRange((prev) => ({ ...prev, [r]: res.items }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load");
        setByRange((prev) => ({ ...prev, [r]: prev[r] ?? [] }));
      }
    },
    [id],
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    api<FeedResponse>(`/clients/${id}/feed?range=${range}`)
      .then((res) => {
        if (!cancelled)
          setByRange((prev) => ({ ...prev, [range]: res.items }));
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Failed to load");
        setByRange((prev) => ({ ...prev, [range]: prev[range] ?? [] }));
      });
    return () => {
      cancelled = true;
    };
  }, [router, id, range]);

  // refresh the open range after a sidebar Sync completes
  useEffect(() => {
    const onSynced = () => {
      setByRange({});
      load(range);
    };
    window.addEventListener("sources-synced", onSynced);
    return () => window.removeEventListener("sources-synced", onSynced);
  }, [load, range]);

  const items = byRange[range];
  const loading = items === undefined;
  const groups = items ? groupByDay(items) : [];

  return (
    <AppShell title="Recent activity">
      <div className="canvas-warm h-full overflow-y-auto">
        <div className="w-full px-6 pb-10 pt-8">
          <PageHeader
            title="Recent activity"
            description="Everything ingested from this client's sources, newest first."
            actions={<RangeSwitch value={range} onChange={setRange} />}
          />

          {!items && loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : !items || items.length === 0 ? (
            <div className="rounded-xl bg-card px-5 py-8 text-center shadow-soft">
              <p className="text-sm text-muted-foreground">
                No activity {range === "all" ? "yet" : `in ${range === "week" ? "the last 7 days" : "the last 30 days"}`}.
              </p>
              {range !== "all" && (
                <button
                  type="button"
                  onClick={() => setRange("all")}
                  className="mt-2 text-[13px] text-link hover:underline"
                >
                  View all time
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map(([label, dayItems]) => (
                <section key={label}>
                  <h2 className="mb-2 px-1 text-[11px] font-[510] uppercase tracking-[0.07em] text-muted-foreground/70">
                    {label}
                  </h2>
                  <ul className="divide-y divide-border/60 rounded-xl bg-card shadow-soft">
                    {dayItems.map((item) => {
                      const Icon = PROVIDER_ICON[item.source];
                      const meta = metaLine(item);
                      return (
                        <li key={item.id} className="flex gap-3 px-4 py-3">
                          <span
                            className="mt-0.5 grid size-5 shrink-0 place-items-center"
                            title={PROVIDER_LABEL[item.source]}
                          >
                            {Icon && <Icon className="size-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground">
                              {item.content}
                            </p>
                            {meta && (
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {meta}
                              </p>
                            )}
                          </div>
                          {item.source_timestamp && (
                            <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-muted-foreground/70">
                              {timeLabel(item.source_timestamp)}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
