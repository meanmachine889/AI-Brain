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
  Tick02Icon,
} from "@hugeicons/core-free-icons";

import { SectionFrame } from "@/components/yash-components/section-frame";
import { SlackIcon, GmailIcon, JiraIcon } from "@/components/brand-icons";

// Highlight important words in black inside a flowing paragraph.
function Hl({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>;
}

// ── Step graphics (hand-built, original) ─────────────────────────────────────
// Each is a soft tinted panel with a small UI motif meaningful to its step, in
// a distinct professional accent. Lowkey but not empty.

// A small app tile holding a real brand logo.
function AppTile({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-8 items-center justify-center rounded-lg bg-white shadow-soft ring-1 ring-black/[0.04]">
      {children}
    </span>
  );
}

// 01 — Connect. Real Slack / Gmail / Jira logos flowing into one hub.
function ConnectGraphic() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(150deg,#eef4ff_0%,#e3edfd_100%)]">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-2">
          <AppTile>
            <SlackIcon className="size-4" />
          </AppTile>
          <AppTile>
            <GmailIcon className="size-4" />
          </AppTile>
          <AppTile>
            <JiraIcon className="size-4" />
          </AppTile>
        </div>
        <div className="h-px w-6 bg-[#5b8def]/40" />
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#3f6fd6] text-white shadow-soft">
          <HugeiconsIcon icon={Link01Icon} size={18} strokeWidth={1.8} />
        </span>
      </div>
    </div>
  );
}

// 02 — Chunk + embed. A document splitting into vector dots.
function EmbedGraphic() {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-4 bg-[linear-gradient(150deg,#eef0fc_0%,#e3e6fa_100%)]">
      <span className="flex size-9 items-center justify-center rounded-lg bg-white text-[#5e6ad2] shadow-soft ring-1 ring-black/[0.04]">
        <HugeiconsIcon icon={DistributionIcon} size={18} strokeWidth={1.8} />
      </span>
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            className="size-1.5 rounded-full"
            style={{ background: "#5e6ad2", opacity: 0.25 + (i % 3) * 0.25 }}
          />
        ))}
      </div>
    </div>
  );
}

// 03 — Summarize. A brief card with soft text lines.
function SummarizeGraphic() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(150deg,#fdf4e8_0%,#fbe9d4_100%)]">
      <div className="w-32 rounded-lg bg-white/85 p-3 shadow-soft ring-1 ring-black/[0.04] backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded bg-[#e8923a] text-white">
            <HugeiconsIcon icon={File01Icon} size={11} strokeWidth={2} />
          </span>
          <div className="h-1.5 w-12 rounded-full bg-foreground/15" />
        </div>
        <div className="mt-2.5 space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-foreground/10" />
          <div className="h-1.5 w-3/4 rounded-full bg-foreground/10" />
          <div className="h-1.5 w-5/6 rounded-full bg-foreground/10" />
        </div>
      </div>
    </div>
  );
}

// 04 — Ask. A search bar with a cited-source chip.
function AskGraphic() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(150deg,#f3effd_0%,#e9e1fb_100%)]">
      <div className="w-36">
        <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 shadow-soft ring-1 ring-black/[0.04]">
          <HugeiconsIcon icon={Search01Icon} className="text-[#8159d6]" size={13} strokeWidth={2} />
          <div className="h-1.5 w-16 rounded-full bg-foreground/15" />
        </div>
        <div className="mt-2 flex justify-end">
          <span className="rounded-full bg-[#8159d6]/12 px-2 py-0.5 text-[9px] font-medium text-[#6b46c1]">
            cited source
          </span>
        </div>
      </div>
    </div>
  );
}

// 05 — Watch. An alert card over two faint stacked rows.
function WatchGraphic() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(150deg,#fdeeec_0%,#fbdedb_100%)]">
      <div className="relative w-32">
        <div className="absolute -right-2 -top-2 h-full w-full rounded-lg bg-white/40" />
        <div className="absolute -right-1 -top-1 h-full w-full rounded-lg bg-white/60" />
        <div className="relative flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2.5 shadow-soft ring-1 ring-black/[0.04]">
          <span className="flex size-6 items-center justify-center rounded-full bg-[#e8595a]/12 text-[#e8595a]">
            <HugeiconsIcon icon={Alert01Icon} size={13} strokeWidth={2} />
          </span>
          <div className="space-y-1">
            <div className="h-1.5 w-14 rounded-full bg-foreground/15" />
            <div className="h-1.5 w-9 rounded-full bg-foreground/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

// 06 — Sync. A circular sync loop with an "up to date" check.
function SyncGraphic() {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-3 bg-[linear-gradient(150deg,#eaf7f0_0%,#d9f0e3_100%)]">
      <span className="flex size-12 items-center justify-center rounded-full bg-white text-[#27a644] shadow-soft ring-1 ring-black/[0.04]">
        <HugeiconsIcon icon={RefreshIcon} size={20} strokeWidth={1.8} />
      </span>
      <span className="flex items-center gap-1 rounded-full bg-[#27a644]/12 px-2 py-0.5 text-[9px] font-medium text-[#1f7d35]">
        <HugeiconsIcon icon={Tick02Icon} size={9} strokeWidth={3} />
        up to date
      </span>
    </div>
  );
}

// The real pipeline, end to end (apps/api/README.md: ingest in the background,
// read instantly). Six equal steps in a grid so nothing is left unexplained.
const STEPS: {
  step: string;
  title: string;
  graphic: React.ReactNode;
  desc: React.ReactNode;
}[] = [
  {
    step: "01",
    title: "Connect your tools",
    graphic: <ConnectGraphic />,
    desc: (
      <>
        Authorize <Hl>Slack, Gmail, and Jira</Hl> in a couple of minutes. Neuron
        backfills the last seven days automatically, no uploads.
      </>
    ),
  },
  {
    step: "02",
    title: "Chunk and embed",
    graphic: <EmbedGraphic />,
    desc: (
      <>
        Every message, email, and ticket is split into pieces and turned into a{" "}
        <Hl>vector</Hl>, then stored in a per-client space.
      </>
    ),
  },
  {
    step: "03",
    title: "Summarize",
    graphic: <SummarizeGraphic />,
    desc: (
      <>
        Neuron writes a <Hl>living status brief</Hl> for each client from that
        activity, and refreshes it as new things land.
      </>
    ),
  },
  {
    step: "04",
    title: "Ask anything",
    graphic: <AskGraphic />,
    desc: (
      <>
        Your question is embedded, matched against the client&apos;s history, and
        answered in plain English, <Hl>cited to the source</Hl>.
      </>
    ),
  },
  {
    step: "05",
    title: "Watch for trouble",
    graphic: <WatchGraphic />,
    desc: (
      <>
        Rules run on a schedule to flag <Hl>silent clients</Hl>, looming
        deadlines, stale tickets, and blockers before they become fires.
      </>
    ),
  },
  {
    step: "06",
    title: "Stay current",
    graphic: <SyncGraphic />,
    desc: (
      <>
        Neuron re-syncs <Hl>every two hours</Hl> in the background, so the brain
        stays up to date without anyone lifting a finger.
      </>
    ),
  },
];

// How it works — six equal grid cells walking the full pipeline.
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

        {/* Equal-size grid: 3 across on desktop, 2 rows. Borders make it read as
            one gridded panel, flush to the frame. */}
        <div className="-mx-6 mt-14 grid border-t border-border sm:grid-cols-2 md:grid-cols-3">
          {STEPS.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: (index % 3) * 0.06 }}
              className="flex flex-col border-b border-border md:border-r"
            >
              {/* Graphic — flush, no padding, separated from text by border */}
              <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border">
                {item.graphic}
              </div>

              {/* Text block, separated from the graphic by the border above */}
              <div className="p-7 md:p-8">
                <h3 className="text-lg font-medium text-foreground">
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
