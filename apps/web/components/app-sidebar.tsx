"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, Users } from "lucide-react";
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-3 text-[11px] font-[510] uppercase tracking-[0.06em] text-muted-foreground/80">
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
    "group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors",
    active
      ? "bg-sidebar-accent text-foreground font-[510]"
      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
    disabled && "pointer-events-none opacity-50",
  );
  const inner = (
    <>
      <span className="grid size-4 shrink-0 place-items-center text-current [&_svg]:size-4">
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
        <div className="flex items-center gap-2 px-3 pb-1.5 pt-6">
          {loading ? (
            <div className="h-5 w-28 flex-1 animate-pulse rounded-md bg-muted" />
          ) : (
            <span className="min-w-0 flex-1 truncate text-sm font-[590] tracking-[-0.01em] text-foreground">
              {activeClient?.name ?? "No client"}
            </span>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse panel"
            className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-2 pb-2">
          {activeClient ? (
            <>
              <SectionLabel>Workspace</SectionLabel>
              <div className="flex flex-col gap-0.5">
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
                  asButton
                  onClick={sync}
                  disabled={syncing}
                  icon={
                    <HugeiconsIcon
                      icon={ReloadIcon}
                      className={cn(syncing && "animate-spin")}
                    />
                  }
                  label={syncing ? "Syncing…" : "Sync"}
                />
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
              </div>
            </>
          ) : loading ? (
            <div className="flex flex-col gap-1 px-1 pt-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : (
            <p className="px-3 pt-2 text-xs text-muted-foreground">
              Pick a client from the rail, or add one.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
