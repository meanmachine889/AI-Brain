"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, Users, ScrollText, Search } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home03Icon,
  ReloadIcon,
  Settings01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useWorkspace } from "@/components/app-data";
import { ClientAvatar } from "@/components/avatar";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-5 text-[11px] font-[510] uppercase tracking-[0.07em] text-muted-foreground/70">
      {children}
    </div>
  );
}

function NavItem({
  href,
  onClick,
  active,
  icon,
  label,
  trailing,
  asButton,
  disabled,
}: {
  href?: string;
  onClick?: () => void;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  asButton?: boolean;
  disabled?: boolean;
}) {
  const cls = cn(
    "group flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors",
    active
      ? "nav-active text-foreground font-[510]"
      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
    disabled && "pointer-events-none opacity-50",
  );
  const inner = (
    <>
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center [&_svg]:size-4",
          active ? "text-foreground" : "text-sidebar-foreground/80",
        )}
      >
        {icon}
      </span>
      <span className="flex-1 truncate text-left">{label}</span>
      {trailing}
    </>
  );
  if (asButton) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={cls}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={href!} onClick={onClick} className={cls}>
      {inner}
    </Link>
  );
}

// Inset search well — opens the ⌘K palette rather than filtering in place.
function SearchField() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("open-command-menu"))}
      className="field-inset group flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
    >
      <Search className="size-3.5 shrink-0 opacity-70" />
      <span className="flex-1 text-left">Search</span>
      <kbd className="kbd">⌘K</kbd>
    </button>
  );
}

// Tier 2 — the contextual panel for the active client. In-flow (not the shadcn
// fixed Sidebar) so it can sit cleanly to the right of the rail; collapses to 0.
export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { me, scores, loading, activeClient, syncing, sync } = useWorkspace();
  const { open, toggleSidebar, isMobile } = useSidebar();

  const collapsed = !open && !isMobile;
  const base = activeClient ? `/clients/${activeClient.id}` : "";
  const alertCount = activeClient ? scores[activeClient.id]?.alert_count ?? 0 : 0;

  return (
    <aside
      aria-label="Client"
      data-collapsed={collapsed}
      className={cn(
        "flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out",
        collapsed ? "w-0" : "w-[248px]",
      )}
    >
      <div className="flex h-full min-w-[248px] flex-col">
        {/* Header — active client identity + collapse */}
        <div className="flex items-center gap-2 px-3 pb-3 pt-5">
          {loading ? (
            <div className="h-5 w-28 flex-1 animate-pulse rounded-md bg-muted" />
          ) : (
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {activeClient && (
                <ClientAvatar
                  name={activeClient.name}
                  className="size-5 shrink-0 rounded-md"
                />
              )}
              <span className="min-w-0 truncate text-sm font-[590] tracking-[-0.01em] text-foreground">
                {activeClient?.name ?? "No client"}
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse panel"
            className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>

        <div className="px-2.5">
          <SearchField />
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-2.5 pb-2">
          {activeClient ? (
            <>
              <SectionLabel>Workspace</SectionLabel>
              <div className="flex flex-col gap-[3px]">
                <NavItem
                  href={base}
                  onClick={onNavigate}
                  active={pathname === base}
                  icon={<HugeiconsIcon icon={Home03Icon} />}
                  label="Home"
                />
                {alertCount > 0 && (
                  <NavItem
                    href={`${base}/alerts`}
                    onClick={onNavigate}
                    active={pathname === `${base}/alerts`}
                    icon={<HugeiconsIcon icon={AlertCircleIcon} />}
                    label="Attention"
                    trailing={
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-crimson/15 px-1.5 text-[11px] font-[510] tabular-nums text-crimson">
                        {alertCount}
                      </span>
                    }
                  />
                )}
                <NavItem
                  href={`${base}/configuration`}
                  onClick={onNavigate}
                  active={pathname === `${base}/configuration`}
                  icon={<HugeiconsIcon icon={Settings01Icon} />}
                  label="Configuration"
                />
                {me?.is_owner && (
                  <NavItem
                    href={`${base}/members`}
                    onClick={onNavigate}
                    active={pathname === `${base}/members`}
                    icon={<Users />}
                    label="Members"
                  />
                )}
                {me?.is_owner && (
                  <NavItem
                    href={`${base}/activity`}
                    onClick={onNavigate}
                    active={pathname === `${base}/activity`}
                    icon={<ScrollText />}
                    label="Activity"
                  />
                )}
              </div>

            </>
          ) : loading ? (
            <div className="flex flex-col gap-1 px-1 pt-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <p className="px-3 pt-4 text-xs text-muted-foreground">
              Pick a client from the rail, or add one.
            </p>
          )}
        </div>

        {/* Footer — sync card (the screenshot's bottom-card slot) */}
        {activeClient && (
          <div className="px-2.5 pb-2.5">
            <div className="ring-hairline rounded-xl bg-sidebar-accent/30 p-3">
              <p className="text-[12px] font-[510] text-foreground">Sources feed</p>
              <p className="mb-2.5 mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                Pull the latest activity into this client&apos;s brain.
              </p>
              <button
                type="button"
                onClick={sync}
                disabled={syncing}
                className={cn(
                  "nav-active flex h-7.5 w-full items-center justify-center gap-2 rounded-lg text-[12px] font-[510] text-foreground transition-opacity",
                  syncing && "pointer-events-none opacity-60",
                )}
              >
                <HugeiconsIcon
                  icon={ReloadIcon}
                  className={cn("size-3.5", syncing && "animate-spin")}
                />
                {syncing ? "Syncing…" : "Sync now"}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
