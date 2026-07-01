"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Logo } from "@/components/logo";

// Rotating value props shown on the left brand panel — mirrors the product's
// four core systems (see agency-ai-brain-tech.md). Marketing copy only.
const SLIDES = [
  {
    title: "One brain for every client",
    body: "Slack, Gmail, and Jira flow into a single living context — no uploads, no copy-paste.",
  },
  {
    title: "Ask anything. Get cited answers.",
    body: "Type a question in plain English and get an answer in seconds, cited to the exact message or ticket.",
  },
  {
    title: "Know what needs you first",
    body: "A morning feed surfaces silent clients, slipping deadlines, and blocked work before you open Slack.",
  },
];

function BrandPanel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[active];

  return (
    <div
      className="relative hidden flex-col justify-between overflow-hidden rounded-3xl bg-cover bg-center p-10 md:flex lg:p-12"
      style={{ backgroundImage: "url('/cta%20assets/bg.png')" }}
    >
      {/* darken toward the bottom so text stays legible over the image */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/60" />

      {/* top: logomark */}
      <div className="relative flex items-center gap-2.5">
        <Logo className="size-9" />
        <span className="font-[family-name:var(--font-poppins)] text-[15px] font-semibold text-white">
          Neuron
        </span>
      </div>

      {/* center: brand mark tile */}
      <div className="relative flex flex-1 items-center justify-center">
        <Logo className="size-20 shadow-2xl" />
      </div>

      {/* bottom: rotating tagline + carousel dots */}
      <div className="relative font-[family-name:var(--font-poppins)]">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h2 className="max-w-sm text-2xl font-semibold leading-tight tracking-tight text-white lg:text-[28px]">
            {slide.title}
          </h2>
          <p className="mt-3 max-w-sm text-sm font-light leading-relaxed text-white/70">
            {slide.body}
          </p>
        </motion.div>

        <div className="mt-8 flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Split-screen auth chrome on a dark page: two rounded panels side by side —
 * brand image panel (bg.png) on the left, the page's form card on the right.
 * Used by /login and /accept-invite so onboarding feels of a piece with the
 * marketing surface.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-onyx p-4 sm:p-5 md:p-6">
      <div className="grid min-h-[calc(100svh-2rem)] gap-4 sm:min-h-[calc(100svh-2.5rem)] sm:gap-5 md:min-h-[calc(100svh-3rem)] md:grid-cols-2 md:gap-6 lg:grid-cols-[1fr_1.05fr]">
        <BrandPanel />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex min-h-[560px] flex-col rounded-3xl bg-background shadow-2xl ring-1 ring-white/10 md:min-h-0"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
