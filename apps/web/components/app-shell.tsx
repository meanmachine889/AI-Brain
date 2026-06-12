"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PanelLeft, PanelLeftOpen } from "lucide-react";
import { getToken } from "@/lib/api";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WorkspaceProvider } from "@/components/app-data";
import { AppRail } from "@/components/app-rail";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandMenu } from "@/components/command-menu";

// Authenticated app shell: two-tier sidebar (slim rail + contextual panel) +
// a floating content inset. Pages render their body as children; the shell
// handles the auth gate.
export function AppShell({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <WorkspaceProvider>
      <SidebarProvider>
        <ShellInner title={title}>{children}</ShellInner>
      </SidebarProvider>
    </WorkspaceProvider>
  );
}

function ShellInner({ children, title }: { children: ReactNode; title?: string }) {
  const { open, setOpenMobile, openMobile, toggleSidebar } = useSidebar();

  return (
    <div className="flex h-svh w-full overflow-hidden bg-sidebar">
      <CommandMenu />

      {/* Tier 1 + 2 — desktop */}
      <div className="hidden md:flex">
        <AppRail />
        <AppSidebar />
      </div>

      {/* Tier 1 + 2 — mobile drawer */}
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-auto border-0 bg-rail p-0 [&>button]:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex h-full">
            <AppRail onNavigate={() => setOpenMobile(false)} />
            <AppSidebar onNavigate={() => setOpenMobile(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Content inset — floating card on the panel-colored backdrop */}
      <main className="matte relative flex min-w-0 flex-1 flex-col overflow-hidden bg-background md:my-2 md:mr-2 md:ml-2 md:rounded-xl md:shadow-raised">
        {/* mobile header */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            aria-label="Open navigation"
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <PanelLeft className="size-4" />
          </button>
          <span className="text-sm font-[510]">{title ?? "Agency Brain"}</span>
        </header>

        {/* desktop: expand affordance when the panel is collapsed */}
        {!open && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Expand panel"
            className="absolute left-3 top-3 z-10 hidden size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:grid"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        )}

        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
