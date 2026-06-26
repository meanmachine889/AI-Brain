"use client";

import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    } as any); // @studio-freight/lenis types are loose

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const id = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
