"use client";

import { cn } from "@/lib/utils";

interface MarqueeProps {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children?: React.ReactNode;
  gap?: string;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = true,
  children,
  gap = "2rem",
}: MarqueeProps) {
  return (
    <div
      className={cn("group flex overflow-hidden", className)}
      style={{ "--gap": gap } as React.CSSProperties}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          className={cn(
            "flex shrink-0 items-center justify-around min-w-full",
            "gap-[--gap]",
            reverse ? "animate-marquee-reverse" : "animate-marquee",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
