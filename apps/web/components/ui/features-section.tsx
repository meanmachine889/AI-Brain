"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export interface FeatureTab {
  title: string;
  value: string;
  description: string;
  content: React.ReactNode;
  badge?: string;
}

interface FeaturesSectionProps {
  tabs: FeatureTab[];
  className?: string;
}

export function FeaturesSection({ tabs, className }: FeaturesSectionProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.value ?? "");

  const active = tabs.find((t) => t.value === activeTab) ?? tabs[0];

  return (
    <div className={cn("w-full", className)}>
      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/40 p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "relative flex-1 min-w-[120px] rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activeTab === tab.value
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/80"
            )}
          >
            {/* Active tab background pill */}
            {activeTab === tab.value && (
              <motion.span
                layoutId="features-tab-pill"
                className="absolute inset-0 rounded-lg bg-background shadow-sm border border-border/60"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{tab.title}</span>
          </button>
        ))}
      </div>

      {/* Content panel */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-background">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="grid md:grid-cols-[1fr_1.4fr] min-h-[420px]"
          >
            {/* Left: description */}
            <div className="flex flex-col justify-center p-8 md:p-10 border-b md:border-b-0 md:border-r border-border">
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              >
                <h3 className="text-xl font-semibold text-foreground mb-3 tracking-tight">
                  {active?.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                  {active?.description}
                </p>
                {active?.badge && (
                  <div className="mt-6 flex flex-wrap gap-1.5">
                    {active.badge.split(" · ").map((b) => (
                      <span
                        key={b}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/60"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right: illustration */}
            <div className="flex items-center justify-center p-6 bg-muted/20">
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.08 }}
                className="w-full h-full flex items-center justify-center min-h-[280px]"
              >
                {active?.content}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
