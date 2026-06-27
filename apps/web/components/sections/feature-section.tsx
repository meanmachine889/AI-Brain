"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// One feature = one full-width section. Two columns on md+ (text + visual),
// stacked on mobile. `reverse` puts the visual on the left, which drives the
// alternating rhythm down the page.
export function FeatureSection({
  eyebrow,
  headline,
  tagline,
  points,
  reverse = false,
  className,
  children,
}: {
  eyebrow: string;
  headline: React.ReactNode;
  tagline: React.ReactNode;
  points?: string[];
  reverse?: boolean;
  className?: string;
  children: React.ReactNode; // the visual
}) {
  return (
    <section className={cn("border-t border-border/40 py-20 md:py-24", className)}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
        {/* Text column */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className={cn(reverse && "md:order-2")}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
            {eyebrow}
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {headline}
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            {tagline}
          </p>

          {points && points.length > 0 && (
            <ul className="mt-6 space-y-2.5">
              {points.map((point) => (
                <li key={point} className="flex items-center gap-2.5 text-sm text-foreground/80">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-indigo/10 text-indigo">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Visual column */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={cn(reverse && "md:order-1")}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
