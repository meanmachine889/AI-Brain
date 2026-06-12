"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  Users,
  ScrollText,
  Plus,
  LogOut,
  Settings2,
  SunMoon,
  Activity,
} from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home03Icon,
  ReloadIcon,
  Settings01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { logout } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/app-data";
import { ClientAvatar } from "@/components/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Command = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
};

// ⌘K quick switcher — clients, pages of the active client, and global actions.
// Opened by the sidebar search well (via the "open-command-menu" event) or the
// keyboard shortcut; everything in the app is two keystrokes away.
export function CommandMenu() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { me, clients, scores, activeClient, sync } = useWorkspace();

  const [open, _setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // every open starts fresh (no effect needed — reset where state flips)
  const setOpen = useCallback((next: boolean) => {
    _setOpen(next);
    if (next) {
      setQuery("");
      setActiveIdx(0);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        _setOpen((o) => {
          if (!o) {
            setQuery("");
            setActiveIdx(0);
          }
          return !o;
        });
      }
    };
    const onOpen = () => setOpen(true);
    // browser back/forward shouldn't leave a stale palette over the new page
    const onPop = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-menu", onOpen);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-menu", onOpen);
      window.removeEventListener("popstate", onPop);
    };
  }, [setOpen]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router, setOpen],
  );

  const commands = useMemo<Command[]>(() => {
    const base = activeClient ? `/clients/${activeClient.id}` : "";
    const alertCount = activeClient
      ? scores[activeClient.id]?.alert_count ?? 0
      : 0;

    const nav: Command[] = activeClient
      ? [
          {
            id: "nav-home",
            group: "Navigate",
            label: "Home",
            hint: activeClient.name,
            icon: <HugeiconsIcon icon={Home03Icon} />,
            run: () => go(base),
          },
          {
            id: "nav-feed",
            group: "Navigate",
            label: "Recent activity",
            hint: activeClient.name,
            icon: <Activity />,
            run: () => go(`${base}/feed`),
          },
          ...(alertCount > 0
            ? [
                {
                  id: "nav-alerts",
                  group: "Navigate",
                  label: "Attention",
                  hint: `${alertCount} open`,
                  icon: <HugeiconsIcon icon={AlertCircleIcon} />,
                  run: () => go(`${base}/alerts`),
                },
              ]
            : []),
          {
            id: "nav-config",
            group: "Navigate",
            label: "Configuration",
            hint: activeClient.name,
            icon: <HugeiconsIcon icon={Settings01Icon} />,
            run: () => go(`${base}/configuration`),
          },
          ...(me?.is_owner
            ? [
                {
                  id: "nav-members",
                  group: "Navigate",
                  label: "Members",
                  hint: activeClient.name,
                  icon: <Users />,
                  run: () => go(`${base}/members`),
                },
                {
                  id: "nav-activity",
                  group: "Navigate",
                  label: "Access log",
                  hint: activeClient.name,
                  icon: <ScrollText />,
                  run: () => go(`${base}/activity`),
                },
              ]
            : []),
        ]
      : [];

    const clientCmds: Command[] = clients
      .filter((c) => c.id !== activeClient?.id)
      .map((c) => ({
        id: `client-${c.id}`,
        group: "Switch client",
        label: c.name,
        icon: <ClientAvatar name={c.name} className="size-5 rounded-md" />,
        run: () => go(`/clients/${c.id}`),
      }));

    const actions: Command[] = [
      {
        id: "act-sync",
        group: "Actions",
        label: "Sync sources",
        hint: "Slack · Jira · Gmail",
        icon: <HugeiconsIcon icon={ReloadIcon} />,
        run: () => {
          setOpen(false);
          sync();
        },
      },
      {
        id: "act-add",
        group: "Actions",
        label: "Add client",
        icon: <Plus />,
        run: () => go("/dashboard?add=1"),
      },
      ...(me?.is_owner
        ? [
            {
              id: "act-integrations",
              group: "Actions",
              label: "Manage integrations",
              icon: <Settings2 />,
              run: () => go("/integrations"),
            },
          ]
        : []),
      {
        id: "act-theme",
        group: "Actions",
        label: `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`,
        icon: <SunMoon />,
        run: () => {
          setOpen(false);
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
        },
      },
      {
        id: "act-logout",
        group: "Actions",
        label: "Sign out",
        icon: <LogOut />,
        run: async () => {
          setOpen(false);
          await logout();
          router.push("/login");
        },
      },
    ];

    return [...nav, ...clientCmds, ...actions];
  }, [activeClient, clients, scores, me, resolvedTheme, go, setTheme, sync, router, setOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // clamp the cursor when the list shrinks under it
  const cursor = Math.min(activeIdx, Math.max(filtered.length - 1, 0));

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(Math.min(cursor + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(Math.max(cursor - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[cursor]?.run();
    }
  };

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor, query]);

  // group → items, preserving order
  const groups: [string, { cmd: Command; idx: number }[]][] = [];
  filtered.forEach((cmd, idx) => {
    const last = groups[groups.length - 1];
    if (last && last[0] === cmd.group) last[1].push({ cmd, idx });
    else groups.push([cmd.group, [{ cmd, idx }]]);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[16%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Command menu</DialogTitle>

        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Search clients, pages, actions…"
            className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/70"
          />
          <kbd className="kbd shrink-0">esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            groups.map(([group, items]) => (
              <div key={group} className="mb-1 last:mb-0">
                <div className="px-3 pb-1 pt-2 text-[11px] font-[510] uppercase tracking-[0.07em] text-muted-foreground/70">
                  {group}
                </div>
                {items.map(({ cmd, idx }) => (
                  <button
                    key={cmd.id}
                    type="button"
                    data-active={idx === cursor}
                    onClick={() => cmd.run()}
                    onMouseMove={() => setActiveIdx(idx)}
                    className={cn(
                      "flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors",
                      idx === cursor
                        ? "nav-active text-foreground"
                        : "text-foreground/80",
                    )}
                  >
                    <span className="grid size-5 shrink-0 place-items-center text-muted-foreground [&_svg]:size-4">
                      {cmd.icon}
                    </span>
                    <span className="flex-1 truncate text-left">{cmd.label}</span>
                    {cmd.hint && (
                      <span className="shrink-0 text-[11.5px] text-muted-foreground/70">
                        {cmd.hint}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
