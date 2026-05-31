"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/integrations", label: "Integrations" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            🧠 Agency Brain
          </Link>
          <nav className="flex items-center gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted",
                  pathname?.startsWith(l.href) && "text-foreground bg-muted"
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            clearToken();
            router.push("/login");
          }}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
