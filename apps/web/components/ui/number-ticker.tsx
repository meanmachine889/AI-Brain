"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
}

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  duration = 1800,
  className,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });
  const [display, setDisplay] = useState(direction === "down" ? value : 0);

  useEffect(() => {
    if (!isInView) return;
    const timeout = setTimeout(() => {
      const from = direction === "down" ? value : 0;
      const to = direction === "down" ? 0 : value;
      const startTime = performance.now();

      const tick = (now: number) => {
        const t = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(from + (to - from) * eased));
        if (t < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    }, delay * 1000);

    return () => clearTimeout(timeout);
  }, [isInView, value, direction, delay, duration]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {display}
    </span>
  );
}
