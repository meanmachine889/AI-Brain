"use client";

import { motion } from "motion/react";

import { SlackIcon, JiraIcon, GmailIcon, DriveIcon } from "@/components/brand-icons";
import { SectionFrame } from "@/components/yash-components/section-frame";

// Same dashboard image used in the hero. Placeholder for a screen recording.
const DASHBOARD = "/hero%20assets/dashboard.png";

// Highlight important words in black inside a flowing paragraph.
function Hl({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>;
}

// Each feature — a flowing paragraph and a dashboard screenshot below it.
const CELLS: { key: string; img: string; desc: React.ReactNode }[] = [
  {
    key: "alerts",
    img: "/feature%20assets/alert.png",
    desc: (
      <>
        Neuron watches every client and flags what needs you:{" "}
        <Hl>overdue tickets</Hl>, <Hl>blockers</Hl>, <Hl>silent clients</Hl>, and{" "}
        <Hl>scope creep</Hl> against the original brief, so problems reach you
        before they become fires.
      </>
    ),
  },
  {
    key: "recent",
    img: "/feature%20assets/recent.png",
    desc: (
      <>
        A running feed of everything ingested for a client across{" "}
        <Hl>Slack</Hl>, <Hl>Gmail</Hl>, and <Hl>Jira</Hl>, newest first, each item
        linked back to <Hl>the exact source message</Hl> it came from.
      </>
    ),
  },
  {
    key: "configuration",
    img: "/feature%20assets/alert.png",
    desc: (
      <>
        Choose <Hl>which channels, inboxes, and projects</Hl> feed each client,
        set the <Hl>sync cadence</Hl>, and Neuron keeps the brain current in the
        background, no manual uploads.
      </>
    ),
  },
  {
    key: "access-log",
    img: "/feature%20assets/access-log.png",
    desc: (
      <>
        A complete record of <Hl>who opened a client</Hl>, <Hl>what they asked</Hl>,
        and <Hl>when</Hl>, so when a privacy-conscious account asks who touched
        their data, you have an exact answer.
      </>
    ),
  },
];

// Small inline icon for use within the description text.
function InlineIcon({ Icon }: { Icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement }) {
  return (
    <Icon className="mx-0.5 inline-block size-[1.05em] -translate-y-px align-middle select-none" />
  );
}

// Features — "Integrate apps once and ask literally anything you want."
// Centered heading + description, then a full-width product visual.
export function FeaturesSection() {
  return (
    <SectionFrame
      className="font-[family-name:var(--font-poppins)]"
      innerClassName="py-20 text-center md:py-28"
    >
      <section id="features">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl"
        >
          <h2 className="text-3xl font-medium leading-tight tracking-tight text-foreground">
            Anything you need to know about a client, in one place.
          </h2>
        </motion.div>

        {/* Each feature — centered paragraph + dashboard screenshot below
            (placeholder for a screen recording). */}
        <div className="mt-28 space-y-32 md:mt-36 md:space-y-40">
          {CELLS.map((cell) => (
            <motion.div
              key={cell.key}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
            >
              <p className="mx-auto max-w-2xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
                {cell.desc}
              </p>
              <img
                src={cell.img}
                alt=""
                aria-hidden
                className="mt-12 block w-full select-none rounded-xl md:mt-14"
              />
            </motion.div>
          ))}
        </div>
      </section>
    </SectionFrame>
  );
}
