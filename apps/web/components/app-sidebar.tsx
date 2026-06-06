"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Plus,
  LogOut,
  ChevronsUpDown,
  Check,
  PanelLeft,
  Settings2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home03Icon,
  ReloadIcon,
  Settings01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import {
  api,
  logout,
  type Principal,
  type Client,
  type Dashboard,
  type DashboardClient,
  type SummaryResponse,
} from "@/lib/api";
import {
  PROVIDER_ICON,
  PROVIDER_LABEL,
  type Provider,
} from "@/components/brand-icons";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ALL_PROVIDERS: Provider[] = ["slack", "jira", "gmail", "drive"];

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

function scoreDot(score: number): string {
  if (score >= 60) return "bg-red-500";
  if (score >= 30) return "bg-stone-400";
  return "bg-emerald-500";
}

// which providers feed THIS client (its mapped sources)
function mappedProviders(c: Client): Set<Provider> {
  const s = new Set<Provider>();
  if (c.slack_channel_ids.length) s.add("slack");
  if (c.jira_project_keys.length) s.add("jira");
  if (c.domain || c.contact_emails.length) s.add("gmail");
  if (c.drive_folder_ids.length) s.add("drive");
  return s;
}

export function AppSidebar() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const { setOpenMobile, toggleSidebar, state } = useSidebar();

  const [me, setMe] = useState<Principal | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [scores, setScores] = useState<Record<string, DashboardClient>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const activeId = params?.id;
  const activeClient = clients.find((c) => c.id === activeId) ?? null;

  const load = useCallback(async () => {
    try {
      const [meRes, list, dash] = await Promise.all([
        api<Principal>("/auth/me"),
        api<Client[]>("/clients"),
        api<Dashboard>("/dashboard").catch(() => null),
      ]);
      setMe(meRes);
      setClients(list);
      if (dash) {
        const map: Record<string, DashboardClient> = {};
        for (const dc of dash.clients) map[dc.id] = dc;
        setScores(map);
      }
    } catch {
      // 401 handling lives in api()
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const go = () => setOpenMobile(false);
  const mapped = activeClient ? mappedProviders(activeClient) : new Set<Provider>();

  async function sync() {
    if (syncing) return;
    setSyncing(true);
    const id = activeId;
    try {
      // The sync endpoint returns immediately while the worker ingests + re-
      // summarizes in the background. Use the active client's summary
      // `generated_at` as the real "worker finished" signal: capture it now,
      // then poll until it changes so the spinner reflects actual progress.
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

      await load(); // refresh sidebar (clients, attention scores, alerts)
      // tell the open client page to refetch its summary + answers
      window.dispatchEvent(new CustomEvent("sources-synced"));
      toast.success(
        updated ? "Sources updated" : "Sync running — data will appear shortly",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-sidebar-border">
      {/* ---- Client switcher (top, Slack-style) ---- */}
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl p-2 text-left",
                      "bg-background shadow-raised ring-hairline transition",
                      "hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                    )}
                  >
                    <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-foreground text-[11px] font-semibold text-background">
                      {activeClient ? initials(activeClient.name) : "AI"}
                    </span>
                    <div className="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate text-sm font-semibold">
                        {activeClient?.name ?? "Select client"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {me?.agency.name ?? "Workspace"}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                  </button>
                }
              />
              <DropdownMenuContent align="start" sideOffset={6} className="w-64 rounded-xl">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Clients
                  </DropdownMenuLabel>
                  <div className="max-h-72 overflow-y-auto">
                    {clients.map((c) => {
                      const dc = scores[c.id];
                      return (
                        <DropdownMenuItem
                          key={c.id}
                          render={<Link href={`/clients/${c.id}`} onClick={go} />}
                          className="gap-2"
                        >
                          <span className="flex size-5 items-center justify-center rounded bg-muted text-[10px] font-semibold">
                            {initials(c.name)}
                          </span>
                          <span className="truncate">{c.name}</span>
                          {dc && dc.attention_score >= 30 && (
                            <span className={cn("size-2 rounded-full", scoreDot(dc.attention_score))} />
                          )}
                          {activeId === c.id && <Check className="ml-auto size-4" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={<Link href="/dashboard?add=1" onClick={go} />}
                  className="gap-2 text-muted-foreground"
                >
                  <Plus className="size-4" />
                  <span>Add client</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {loading ? (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ) : activeClient ? (
          <>
            {/* Selected client context */}
            <SidebarGroup>
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive
                    tooltip="Home"
                    className="data-active:bg-background data-active:shadow-soft data-active:ring-hairline"
                    render={<Link href={`/clients/${activeClient.id}`} onClick={go} />}
                  >
                    <HugeiconsIcon icon={Home03Icon} />
                    <span>Home</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {(() => {
                  const n = scores[activeClient.id]?.alert_count ?? 0;
                  return n > 0 ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip={`${n} alert${n > 1 ? "s" : ""}`}
                        render={<Link href={`/clients/${activeClient.id}/alerts`} onClick={go} />}
                      >
                        <HugeiconsIcon icon={AlertCircleIcon} />
                        <span>Attention</span>
                        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                          {n}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : null;
                })()}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={syncing ? "Syncing…" : "Sync sources"}
                    disabled={syncing}
                    onClick={sync}
                  >
                    <HugeiconsIcon
                      icon={ReloadIcon}
                      className={cn(syncing && "animate-spin")}
                    />
                    <span>{syncing ? "Syncing…" : "Sync"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Configuration"
                    render={<Link href={`/clients/${activeClient.id}?edit=1`} onClick={go} />}
                  >
                    <HugeiconsIcon icon={Settings01Icon} />
                    <span>Configuration</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {me?.is_owner && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Members"
                      render={<Link href={`/clients/${activeClient.id}/members`} onClick={go} />}
                    >
                      <Users />
                      <span>Members</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroup>

            {/* Integrations — one provider per row; colored if mapped to THIS
                client, grey if not. Collapses to icon-only with the sidebar. */}
            <SidebarGroup>
              <SidebarGroupLabel>Integrations</SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                {ALL_PROVIDERS.map((p) => {
                  const Icon = PROVIDER_ICON[p];
                  const on = mapped.has(p);
                  return (
                    <SidebarMenuItem key={p}>
                      <SidebarMenuButton
                        tooltip={
                          on
                            ? `${PROVIDER_LABEL[p]} · feeding this client`
                            : `${PROVIDER_LABEL[p]} · not mapped`
                        }
                        render={
                          <Link
                            href={`/clients/${activeClient.id}?edit=1`}
                            onClick={go}
                            aria-label={
                              on
                                ? `${PROVIDER_LABEL[p]} mapped`
                                : `Map ${PROVIDER_LABEL[p]}`
                            }
                          />
                        }
                      >
                        <Icon
                          className={cn(
                            "size-4 transition",
                            on ? "opacity-100" : "opacity-40"
                          )}
                        />
                        <span className={cn(!on && "text-muted-foreground")}>
                          {PROVIDER_LABEL[p]}
                        </span>
                        <span
                          className={cn(
                            "ml-auto size-1.5 rounded-full transition",
                            on ? "bg-emerald-500" : "bg-transparent ring-1 ring-border"
                          )}
                        />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            <p className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              {clients.length === 0 ? "No clients yet." : "Pick a client above."}
            </p>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ---- Footer: collapse / theme / account ---- */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={state === "collapsed" ? "Expand" : "Collapse"}
              onClick={toggleSidebar}
            >
              <PanelLeft />
              <span>Collapse</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton tooltip={me?.email ?? "Account"}>
                    <span className="flex aspect-square size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                      {initials(me?.name ?? me?.agency.name ?? "?")}
                    </span>
                    <span className="truncate">{me?.name ?? "Account"}</span>
                    <Settings2 className="ml-auto size-4 text-muted-foreground" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent align="end" side="top" className="w-56 rounded-xl">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="truncate text-xs">
                    {me?.name}
                    {me?.is_owner && (
                      <span className="ml-1 font-normal text-muted-foreground">· owner</span>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                    {me?.email}
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {me?.is_owner && (
                  <DropdownMenuItem render={<Link href="/integrations" onClick={go} />} className="gap-2">
                    <Settings2 className="size-4" />
                    Manage integrations
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    router.push("/login");
                  }}
                  className="gap-2 text-destructive"
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
