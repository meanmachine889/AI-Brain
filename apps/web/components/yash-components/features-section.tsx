"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

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
    label: "Recent Activity",
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
  {
    key: "members",
    label: "Members",
    img: "/feature%20assets/access-log.png",
    desc: (
      <>
        Add your team without handing everyone the keys. The owner grants access{" "}
        <Hl>per client</Hl> as an <Hl>admin</Hl> or <Hl>viewer</Hl>, so the right people
        see the right clients and nothing more.
      </>
    ),
  },
];

// Features — "Integrate apps once and ask literally anything you want."
// Centered heading + description, then a full-width product visual.
export function FeaturesSection() {
  const [active, setActive] = useState(FEATURES[0].key);
  const activeFeature =
    FEATURES.find((feature) => feature.key === active) ?? FEATURES[0];

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
        <Tabs value={active} onValueChange={setActive} className="mt-12">
          {/* All panels are stacked in one grid cell. The inactive ones stay
              mounted but invisible purely to hold the container's height, so it
              never collapses on switch. The visible content is keyed by the
              active tab and re-animates on every change via AnimatePresence. */}
          <div className="grid">
            {FEATURES.map((feature) => (
              <TabsContent
                key={feature.key}
                value={feature.key}
                keepMounted
                aria-hidden={feature.key !== active}
                className="invisible col-start-1 row-start-1 m-0 block w-full [&[hidden]]:block"
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
              </TabsContent>
            ))}

            <div className="pointer-events-none col-start-1 row-start-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.17 }}
                  className="pointer-events-auto mx-auto"
                >
                  <p className="mx-auto max-w-2xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
                    {activeFeature.desc}
                  </p>
                  <img
                    src={activeFeature.img}
                    alt=""
                    aria-hidden
                    className="mt-12 block w-full select-none rounded-xl md:mt-14"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-12 flex w-full justify-center">
            <TabsList className="!h-auto items-center gap-1 rounded-xl bg-muted p-1">
              {FEATURES.map((feature) => (
                <TabsTrigger
                  key={feature.key}
                  value={feature.key}
                  className="h-auto rounded-lg  px-4 py-2 text-xs leading-none text-muted-foreground transition-colors data-active:bg-background data-active:text-foreground data-active:shadow-sm"
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
