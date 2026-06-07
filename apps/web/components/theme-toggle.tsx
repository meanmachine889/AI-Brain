"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

// Smooth, not laggy: rather than transitioning every element's color (which
// janks on a dense UI), we crossfade the whole document once via the View
// Transition API. Browsers without it just swap instantly. next-themes runs
// with disableTransitionOnChange so nothing else animates underneath.
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  function toggle() {
    const next = isDark ? "light" : "dark";
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (
      typeof doc.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      doc.startViewTransition(() => setTheme(next));
    } else {
      setTheme(next);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mounted ? (isDark ? "Switch to light" : "Switch to dark") : "Toggle theme"}
      className={cn(
        "relative grid size-8 place-items-center rounded-md text-muted-foreground",
        "transition-colors hover:bg-accent hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {/* avoid hydration flash: render nothing definite until mounted */}
      <Sun
        className={cn(
          "size-4 transition-all duration-300",
          mounted && isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
        )}
      />
      <Moon
        className={cn(
          "absolute size-4 transition-all duration-300",
          mounted && isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0",
        )}
      />
    </button>
  );
}
