"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";

import { SectionFrame } from "@/components/yash-components/section-frame";

const TIERS: {
  name: string;
  price: string;
  period: string;
  desc: string;
  cta: string;
  highlight: boolean;
  features: string[];
}[] = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "Try Neuron on a single client. No card needed.",
    cta: "Get started",
    highlight: false,
    features: [
      "1 client brain",
      "Slack integration",
      "Natural-language Q&A",
      "7 days of history",
    ],
  },
  {
    name: "Pro",
    price: "₹12,000",
    period: "/ month",
    desc: "For agencies running several clients, flat, not per seat.",
    cta: "Start 14-day trial",
    highlight: true,
    features: [
      "Up to 5 client brains",
      "Slack, Gmail, and Jira",
      "Attention feed and alerts",
      "Per-client summaries",
      "Team members and roles",
    ],
  },
  {
    name: "Agency",
    price: "Custom",
    period: "",
    desc: "For larger agencies with many clients and stricter needs.",
    cta: "Talk to us",
    highlight: false,
    features: [
      "Unlimited client brains",
      "All integrations",
      "Audit trail and erasure",
      "Self-host or Vertex AI",
      "Priority support",
    ],
  },
];

export function PricingSection() {
  return (
    <SectionFrame
      className="font-[family-name:var(--font-poppins)]"
      innerClassName="py-16 md:py-20"
    >
      <section id="pricing">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-medium leading-tight tracking-tight text-foreground">
            Simple, flat pricing.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
            Priced per agency, not per seat. Start free, and only pay when Neuron
            is saving your team real time.
          </p>
        </motion.div>

        {/* Equal tier cards, flush to the frame, gridded borders. */}
        <div className="-mx-6 mt-14 grid border-t border-border md:grid-cols-3">
          {TIERS.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className={`relative flex flex-col border-b border-border p-7 md:border-r md:p-8 ${
                tier.highlight ? "bg-muted/50" : ""
              }`}
            >
              {tier.highlight && (
                <span className="absolute right-6 top-7 rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background md:right-8 md:top-8">
                  Popular
                </span>
              )}

              <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {tier.name}
              </p>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-4xl font-medium tracking-tight text-foreground">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-sm font-light text-muted-foreground">
                    {tier.period}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">
                {tier.desc}
              </p>

              <ul className="mt-7 flex-1 space-y-3 border-t border-border pt-7">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-sm font-light text-foreground"
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald/15 text-emerald">
                      <HugeiconsIcon icon={Tick02Icon} size={10} strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/waitlist"
                className={`mt-8 flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] ${
                  tier.highlight
                    ? "bg-foreground text-background hover:opacity-90"
                    : "border border-border text-foreground hover:bg-muted"
                }`}
              >
                {tier.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs font-light text-muted-foreground/70">
          Every plan includes database-level isolation. No credit card required to
          start.
        </p>
      </section>
    </SectionFrame>
  );
}
