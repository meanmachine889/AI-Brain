"use client";

import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Link01Icon,
  DistributionIcon,
  File01Icon,
  Search01Icon,
  Alert01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";

import { SectionFrame } from "@/components/yash-components/section-frame";

// Highlight important words in black inside a flowing paragraph.
function Hl({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>;
}

// The real pipeline, end to end (apps/api/README.md: ingest in the background,
// read instantly). Six equal steps so nothing is left unexplained.
const STEPS: {
  key: string;
  icon: typeof Link01Icon;
  title: string;
  desc: React.ReactNode;
}[] = [
  {
    key: "connect",
    icon: Link01Icon,
    title: "Plug in your tools.",
    desc: (
      <>
        Authorize <Hl>Slack, Gmail, and Jira</Hl>. Neuron backfills the last seven
        days automatically.
      </>
    ),
  },
  {
    key: "embed",
    icon: DistributionIcon,
    title: "Turn it into memory.",
    desc: (
      <>
        Every message, email, and ticket is chunked and stored as a{" "}
        <Hl>vector</Hl> in a per-client space.
      </>
    ),
  },
  {
    key: "summarize",
    icon: File01Icon,
    title: "A living brief per client.",
    desc: (
      <>
        Neuron writes a <Hl>status brief</Hl> for each client and refreshes it as
        new activity lands.
      </>
    ),
  },
  {
    key: "ask",
    icon: Search01Icon,
    title: "Answers you can trust.",
    desc: (
      <>
        Ask in plain English and get an answer matched to the client&apos;s
        history, <Hl>cited to the source</Hl>.
      </>
    ),
  },
  {
    key: "watch",
    icon: Alert01Icon,
    title: "Catch trouble early.",
    desc: (
      <>
        Rules flag <Hl>silent clients</Hl>, deadlines, stale tickets, and blockers
        before they become fires.
      </>
    ),
  },
  {
    key: "sync",
    icon: RefreshIcon,
    title: "Always up to date.",
    desc: (
      <>
        Neuron re-syncs <Hl>every two hours</Hl> in the background, so the brain
        stays current on its own.
      </>
    ),
  },
];

// How it works — six equal cards: icon placeholder on top, heading and
// description anchored at the bottom (Aside-style).
export function HowItWorksSection() {
  return (
    <SectionFrame
      className="font-[family-name:var(--font-poppins)]"
      innerClassName="pt-16 md:pt-20"
    >
      <section id="how-it-works">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <h2 className="text-3xl font-medium leading-tight tracking-tight text-foreground">
            How it works, end to end.
          </h2>
          <p className="mt-5 max-w-xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
            From connecting a tool to a cited answer, here is the whole pipeline
            with nothing hidden.
          </p>
        </motion.div>

        {/* Equal cards: 3 across, 2 rows. Flush to the frame, gridded borders. */}
        <div className="-mx-6 mt-14 grid border-t border-border sm:grid-cols-2 md:grid-cols-3">
          {STEPS.map((item, index) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: (index % 3) * 0.06 }}
              className="relative flex min-h-[300px] flex-col border-b border-border bg-[linear-gradient(160deg,#f7f8fb_0%,#eef1f7_100%)] p-7 md:border-r md:p-8"
            >
              {/* Faint grain overlay for texture */}
              <div className="matte pointer-events-none absolute inset-0" aria-hidden />

              {/* Icon tile — gradient fill + border + soft shadow for a subtle
                  raised 3D feel */}
              <div className="relative flex size-12 items-center justify-center rounded-xl border border-white/60 bg-[linear-gradient(160deg,#ffffff_0%,#eef1f7_100%)] text-foreground shadow-raised ring-1 ring-black/[0.04]">
                <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.8} />
              </div>

              {/* Heading + description, anchored to the bottom */}
              <div className="relative mt-auto pt-12">
                <h3 className="text-xl font-medium tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-sm font-light leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </SectionFrame>
  );
}
