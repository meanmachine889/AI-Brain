"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, LogOut, Settings2 } from "lucide-react";
import { logout } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/app-data";
import { ClientAvatar, PersonAvatar } from "@/components/avatar";
import {
  PROVIDER_ICON,
  PROVIDER_LABEL,
  type Provider,
} from "@/components/brand-icons";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

// Tier 1 — the slim, always-dark rail (Slack-style), floating as a rounded card.
// Workspace mark on top, one avatar tile per client (active = lifted + lime
// edge), then the agency-wide integrations, theme and account.
export function AppRail({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { me, clients, connected, loading, activeId } = useWorkspace();

  return (
    <nav
      aria-label="Workspace"
      className="matte flex w-[64px] shrink-0 flex-col items-center gap-1 self-stretch overflow-hidden border-r border-white/[0.05] bg-rail py-3 text-rail-foreground"
    >
      {/* Workspace mark */}
      <div className="mb-2 grid size-9 place-items-center rounded-[10px] bg-obsidian text-mist shadow-depth">
        <span className="text-[12px] font-[590] tracking-tight">AB</span>
      </div>

      {/* Clients */}
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto py-1">
        {loading
          ? [0, 1, 2].map((i) => (
              <div key={i} className="size-9 animate-pulse rounded-xl bg-white/5" />
            ))
          : clients.map((c) => {
              const active = c.id === activeId;
              return (
                <Tooltip key={c.id}>
                  <TooltipTrigger
                    render={
                      <Link
                        href={`/clients/${c.id}`}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative block size-9 rounded-xl transition-all",
                          active
                            ? "shadow-depth ring-1 ring-white/25"
                            : "opacity-70 saturate-[0.85] hover:opacity-100 hover:saturate-100",
                        )}
                      >
                        <ClientAvatar name={c.name} className="size-full" />
                        <span
                          className={cn(
                            "absolute -left-[14px] top-1/2 h-5 -translate-y-1/2 rounded-r-full bg-acid-lime transition-all",
                            active ? "w-[3px] opacity-100" : "w-0 opacity-0",
                          )}
                        />
                      </Link>
                    }
                  />
                  <TooltipContent side="right">{c.name}</TooltipContent>
                </Tooltip>
              );
            })}

        {/* Add client */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/dashboard?add=1"
                onClick={onNavigate}
                aria-label="Add client"
                className="grid size-9 place-items-center rounded-xl text-fog transition-colors hover:bg-white/[0.08] hover:text-snow"
              >
                <Plus className="size-4" />
              </Link>
            }
          />
          <TooltipContent side="right">Add client</TooltipContent>
        </Tooltip>
      </div>

      {/* Integrations — agency-wide sources. Full-color when connected. */}
      <div className="flex flex-col items-center gap-1 border-t border-white/[0.06] pt-2">
        {ALL_PROVIDERS.map((p) => {
          const Icon = PROVIDER_ICON[p];
          const on = connected.has(p);
          return (
            <Tooltip key={p}>
              <TooltipTrigger
                render={
                  <Link
                    href="/integrations"
                    onClick={onNavigate}
                    aria-label={`${PROVIDER_LABEL[p]} ${on ? "connected" : "not connected"}`}
                    className="relative grid size-9 place-items-center rounded-xl transition-colors hover:bg-white/[0.08]"
                  >
                    <Icon
                      className={cn(
                        "size-[17px] transition",
                        on ? "opacity-100" : "opacity-35 grayscale",
                      )}
                    />
                    {on && (
                      <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-emerald" />
                    )}
                  </Link>
                }
              />
              <TooltipContent side="right">
                {PROVIDER_LABEL[p]} · {on ? "connected" : "not connected"}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Theme toggle */}
      <ThemeToggle className="mt-1 text-fog hover:bg-white/[0.08] hover:text-snow" />

      {/* Account */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              aria-label="Account"
              className="mt-0.5 grid size-9 place-items-center rounded-xl transition-colors hover:bg-white/[0.06]"
            >
              <PersonAvatar
                seed={me?.email ?? me?.name ?? "account"}
                alt={me?.name ?? "Account"}
                className="size-7 ring-1 ring-white/15"
              />
            </button>
          }
        />
        <DropdownMenuContent side="right" align="end" className="w-56 rounded-xl">
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
            <DropdownMenuItem
              render={<Link href="/integrations" onClick={onNavigate} />}
              className="gap-2"
            >
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
    </nav>
  );
}
