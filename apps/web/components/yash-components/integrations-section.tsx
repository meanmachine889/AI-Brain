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

// Integrations — "Integrate apps once and ask literally anything you want."
// Centered heading + description, then a full-width product visual.
export function IntegrationsSection() {
  return (
    <SectionFrame
      className="font-[family-name:var(--font-poppins)]"
      innerClassName="relative overflow-hidden py-20 text-center md:py-28"
    >
      {/* Blue radial character — two soft blooms over a faint tint, kept light
          enough that the dark heading stays readable. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 0%, color-mix(in srgb, #e7eaee 32%, transparent) 0%, transparent 60%), radial-gradient(60% 50% at 85% 110%, color-mix(in srgb, #2f80ed 24%, transparent) 0%, transparent 55%), color-mix(in srgb, #2f80ed 8%, transparent)",
        }}
      />
      <section id="integrations" className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl"
        >
          <h2 className="text-3xl font-medium leading-tight tracking-tight text-foreground">
            Integrate apps once and ask literally anything you want!
          </h2>

          <p className="mx-auto mt-9 max-w-3xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
            Connect{" "}
            <InlineIcon Icon={SlackIcon} />,{" "}
            <InlineIcon Icon={GmailIcon} />,{" "}
            <InlineIcon Icon={JiraIcon} />, and{" "}
            <InlineIcon Icon={DriveIcon} /> once, and Neuron keeps reading them for
            you. Then just ask, in plain English, and get an answer pulled from
            everything across a client, cited back to the source.
          </p>
        </motion.div>

        {/* Full-width product visual (placeholder for a screen recording) */}
        <motion.img
          src={DASHBOARD}
          alt="Neuron dashboard"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-14 block select-none"
        />
      </section>
    </SectionFrame>
  );
}
