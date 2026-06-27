"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { SlackIcon, JiraIcon, GmailIcon, DriveIcon } from "@/components/brand-icons";
import { SectionFrame } from "@/components/yash-components/section-frame";

// Same dashboard image used in the hero. Placeholder for a screen recording.
const DASHBOARD = "/hero%20assets/dashboard.png";

// 2×2 grid cells — a dashboard screenshot on a bright gradient, placed
// hero-style (inset, top visible, bottom bleeding off the cell).
const CELLS = [
  {
    label: "Alerts",
    desc: "Open items that need action, per client.",
    img: "/feature%20assets/alert.png",
    gradient: "bg-gradient-to-br from-rose-200 via-orange-200 to-amber-100",
  },
  {
    label: "Recent activity",
    desc: "Everything ingested across a client, newest first.",
    img: "/feature%20assets/recent.png",
    gradient: "bg-gradient-to-br from-indigo-200 via-violet-200 to-sky-100",
  },
  {
    label: "Configuration",
    desc: "Control what gets synced and how.",
    img: "/feature%20assets/alert.png",
    gradient: "bg-gradient-to-br from-emerald-200 via-teal-200 to-cyan-100",
  },
  {
    label: "Access log",
    desc: "Who looked at this client, and when.",
    img: "/feature%20assets/access-log.png",
    gradient: "bg-gradient-to-br from-amber-200 via-yellow-100 to-lime-100",
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
      innerClassName="py-20 text-center md:py-28"
    >
      <section id="integrations">
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

        {/* Secondary description — no heading */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-20 max-w-3xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg"
        >
          You also get a clear view of everything around a client: the{" "}
          <span className="font-medium text-foreground">alerts</span> that need
          action, <span className="font-medium text-foreground">recent activity</span>{" "}
          as it lands, the{" "}
          <span className="font-medium text-foreground">configuration</span> for what
          gets synced, and an{" "}
          <span className="font-medium text-foreground">access log</span> of who
          looked at what.
        </motion.p>

        {/* 2×2 grid — full frame width (escapes the frame's px-6), no gap, no
            rounded corners, shared borders. */}
        <div className="-mx-6 mt-12 grid grid-cols-2 border-t border-border">
          {CELLS.map((cell, i) => (
            <motion.div
              key={cell.label}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: (i % 2) * 0.08 }}
              className={cn(
                "relative flex aspect-[16/10] flex-col overflow-hidden border-border",
                i < 2 && "border-b",
                i % 2 === 0 && "border-r",
                cell.gradient,
              )}
            >
              {/* Caption — top */}
              <div className="relative z-10 px-7 pt-7 text-left">
                <h3 className="text-sm font-medium text-foreground">{cell.label}</h3>
                <p className="mt-1 text-[13px] font-light leading-relaxed text-foreground/60">
                  {cell.desc}
                </p>
              </div>

              {/* Screenshot — centered, bleeds off the bottom (hero-style) */}
              <img
                src={cell.img}
                alt={cell.label}
                className="absolute inset-x-0 -bottom-7 mx-auto w-[82%] max-w-none select-none rounded-t-xl"
              />
            </motion.div>
          ))}
        </div>
      </section>
    </SectionFrame>
  );
}
