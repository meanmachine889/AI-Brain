"use client";

import { motion } from "motion/react";

import { SectionFrame } from "@/components/yash-components/section-frame";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Highlight important words in black inside a flowing paragraph.
function Hl({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>;
}

const FEATURES: {
  key: string;
  label: string;
  img: string;
  desc: React.ReactNode;
}[] = [
  {
    key: "alerts",
    label: "Alerts",
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
    label: "Recent",
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
    label: "Configuration",
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
    label: "Access log",
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
        <Tabs defaultValue={FEATURES[0].key} className="mt-12">
          {FEATURES.map((feature) => (
            <TabsContent key={feature.key} value={feature.key} className="m-0 w-full">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="mx-auto"
              >
                <p className="mx-auto max-w-2xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
                  {feature.desc}
                </p>
                <img
                  src={feature.img}
                  alt=""
                  aria-hidden
                  className="mt-12 block w-full select-none rounded-xl md:mt-14"
                />
              </motion.div>
            </TabsContent>
          ))}

          <div className="flex w-full justify-center">
            <TabsList
            className=""
          >
            {FEATURES.map((feature) => (
              <TabsTrigger
                key={feature.key}
                value={feature.key}
                className=""
              >
                {feature.label}
              </TabsTrigger>
            ))}
          </TabsList>
          </div>
        </Tabs>
      </section>
    </SectionFrame>
  );
}
