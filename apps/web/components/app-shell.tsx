"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

// Authenticated app shell: collapsible sidebar + main content.
// Pages render their body as children; the shell handles the auth gate.
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="md:ring-1 md:ring-sidebar-border md:overflow-hidden">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:hidden">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">{title ?? "Agency Brain"}</span>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
