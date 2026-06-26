"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Try Neuron with one client project. No card needed.",
    cta: "Get started free",
    ctaHref: "#",
    highlight: false,
    badge: null as string | null,
    features: [
      "1 active client brain",
      "100 RAG queries / month",
      "Slack integration only",
      "Natural language Q&A",
      "7-day message history",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    period: "/ month",
    description: "For agencies managing multiple clients with full integrations.",
    cta: "Start 7-day free trial",
    ctaHref: "#",
    highlight: true,
    badge: "Most popular" as string | null,
    features: [
      "5 active client brains",
      "Unlimited RAG queries",
      "Slack, Gmail & Jira",
      "Daily Attention Feed",
      "Scope creep alerts",
      "90-day history",
      "Email support",
    ],
  },
  {
    name: "Agency",
    price: "$149",
    period: "/ month",
    description: "Full power for agencies with many clients and custom needs.",
    cta: "Book a demo",
    ctaHref: "#",
    highlight: false,
    badge: null as string | null,
    features: [
      "Unlimited client brains",
      "Unlimited RAG queries",
      "All integrations + Drive",
      "Custom data retention",
      "Postgres RLS isolation",
      "Priority support + SLA",
      "Team analytics",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-border/40 bg-muted/20 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Pricing
          </p>
          <h2
            className="font-display text-3xl font-bold tracking-tight sm:text-4xl text-foreground mb-3"
            data-gsap-reveal
          >
            Simple, transparent pricing
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Start free. Scale when you&apos;re ready. No seat taxes or hidden fees.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={cn(
                "relative rounded-2xl border p-7 flex flex-col",
                tier.highlight
                  ? "border-indigo/30 bg-white shadow-[0_0_0_1px_rgba(94,106,210,0.15),0_8px_32px_rgba(94,106,210,0.1)]"
                  : "border-border bg-white"
              )}
            >
              {tier.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  {tier.badge}
                </span>
              )}

              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  {tier.name}
                </p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="font-display text-4xl font-bold text-foreground">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-sm text-muted-foreground">{tier.period}</span>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {tier.description}
                </p>
              </div>

              <ul className="space-y-2.5 border-t border-border pt-6 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px] text-foreground">
                    <CheckCircle className="size-3.5 text-emerald-500 shrink-0 mt-[1px]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.ctaHref}
                className={cn(
                  "flex h-10 w-full items-center justify-center rounded-xl text-[13px] font-semibold transition-all duration-150",
                  tier.highlight
                    ? "bg-foreground text-background hover:opacity-90"
                    : "border border-border bg-white hover:bg-muted text-foreground"
                )}
              >
                {tier.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground/60">
          All plans include SOC2-ready Postgres RLS isolation · No credit card required for Starter or Pro trial
        </p>
      </div>
    </section>
  );
}
