"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { SectionFrame } from "@/components/yash-components/section-frame";

// How long each feature stays active before auto-advancing to the next.
const ROTATE_MS = 8000;

// Highlight important words in black inside a flowing paragraph.
function Hl({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>;
}

// Four real, shipped security guarantees — the ones a customer handing us their
// clients' Slack/Gmail/Jira actually cares about. All sourced from
// SECURITY-OVERVIEW.md; nothing overstated.
const FEATURES: {
  key: string;
  label: string; // the clickable row label (left column)
  img: string; // right-side graphic (drop assets in /public/feature assets/security)
  heading: string;
  desc: React.ReactNode;
}[] = [
  {
    key: "isolation",
    label: "Database-level isolation",
    img: "/security%20assets/isolation.jpeg",
    heading: "Your data can't bleed into another agency's",
    desc: (
      <>
        Each agency is walled off by <Hl>Postgres Row-Level Security</Hl>, a rule
        the database itself enforces on every query. Even if our application code
        had a bug, the database would still refuse to return another agency's data,
        so <Hl>two independent layers</Hl> have to fail for any leak.
      </>
    ),
  },
  {
    key: "encrypted",
    label: "Encrypted credentials",
    img: "/security%20assets/encrypted.jpeg",
    heading: "If we're breached, the keys are useless",
    desc: (
      <>
        The tokens that connect to your Slack, Gmail, and Jira are{" "}
        <Hl>encrypted at rest</Hl>, with the key held <Hl>outside the database</Hl>.
        A backup or leak yields unreadable ciphertext, not working credentials.
        Disconnect an integration and we <Hl>revoke it at the provider</Hl> and
        purge what we pulled.
      </>
    ),
  },
  {
    key: "audit",
    label: "Complete audit trail",
    img: "/security%20assets/audit.jpeg",
    heading: "See exactly who looked at what",
    desc: (
      <>
        Every time someone views a client, asks a question, or opens the dashboard,
        we record <Hl>who</Hl>, <Hl>which client</Hl>, and <Hl>when</Hl> — questions
        included. The owner has a dedicated <Hl>Activity page</Hl>, so when a
        privacy-conscious account asks who touched their data, you have an exact
        answer.
      </>
    ),
  },
  {
    key: "erasure",
    label: "Right to erasure",
    img: "/security%20assets/erasure.jpeg",
    heading: "Delete a client completely, in one move",
    desc: (
      <>
        When an engagement ends, deleting a client <Hl>cascades</Hl> — every
        message, email, summary, and alert we stored for them is removed. That's
        how we satisfy <Hl>right-to-erasure</Hl> (e.g. GDPR Article 17), with
        nothing left lingering in the brain.
      </>
    ),
  },
];

// Security — "Built for client trust." A left list of clickable guarantees; the
// right side shows a graphic + heading + description for the active one.
export function SecuritySection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFeature = FEATURES[activeIndex];

  const reduceMotion = useReducedMotion();

  // `cycle` bumps every time we (re)start a feature's timer — clicking or
  // auto-advancing. It re-keys the progress bar so the fill restarts cleanly.
  const [cycle, setCycle] = useState(0);

  // Auto-advance: always runs (regardless of scroll position) so the rotation
  // stays seamless when the section comes into view. Re-armed on every change of
  // active feature or cycle (click).
  useEffect(() => {
    if (reduceMotion) return;
    const timer = setTimeout(() => {
      setActiveIndex((i) => (i + 1) % FEATURES.length);
    }, ROTATE_MS);
    return () => clearTimeout(timer);
  }, [activeIndex, cycle, reduceMotion]);

  const select = (index: number) => {
    setActiveIndex(index);
    setCycle((c) => c + 1); // restart the timer + fill for the clicked row
  };

  return (
    <SectionFrame
      className="font-[family-name:var(--font-poppins)]"
      innerClassName="pt-16 md:pt-20"
    >
      <section id="security">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-medium leading-tight tracking-tight text-foreground">
            Your clients&apos; data deserves a higher bar.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
            You&apos;re trusting Neuron with your clients&apos; private Slack, inboxes,
            and tickets. Here&apos;s how we keep it isolated, encrypted, and
            accountable.
          </p>
        </motion.div>

        <div className="-mx-6 mt-14 grid border-b border-border md:grid-cols-[minmax(0,1fr)_1.3fr]">
          {/* Left — clickable feature rows, then the Gemini notice card filling
              the space below them. */}
          <div className="flex flex-col">
            <div className="flex flex-col border-t border-border">
              {FEATURES.map((feature, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={feature.key}
                    type="button"
                    onClick={() => select(index)}
                    aria-pressed={isActive}
                    className="group relative overflow-hidden border-b border-border py-5 text-left"
                  >
                    {/* Progress fill — a subtle grey wash sweeping left→right over
                        ROTATE_MS on the active row, signifying time until the next
                        feature. Re-keyed per switch/click so it restarts cleanly. */}
                    {isActive && !reduceMotion && (
                      <motion.span
                        key={`${activeIndex}-${cycle}`}
                        aria-hidden
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: ROTATE_MS / 1000, ease: "linear" }}
                        className="pointer-events-none absolute inset-y-0 left-0 bg-foreground/[0.025]"
                      />
                    )}
                    <span
                      className={`relative block px-4 text-base font-light transition-colors sm:text-lg ${
                        isActive
                          ? "font-medium text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {feature.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Gemini notice — the one place data leaves, as a premium gradient
                card filling the empty space under the feature list. */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5 }}
              className="relative flex flex-1 flex-col justify-center overflow-hidden border-t border-border p-5 py-7"
            >
              {/* Background image — soft blue grain, behind the content */}
              <img
                src="/feature%20assets/image.png"
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-40"
              />

              <div className="relative">
                <h3 className="text-xl font-medium leading-snug tracking-tight text-foreground">
                  AI processing, transparently
                </h3>
                <p className="mt-5 max-w-xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
                  Summaries and answers are processed by{" "}
                  <Hl>Google&apos;s Gemini API</Hl> on the paid tier, where your data
                  is <Hl>never used to train models</Hl>. Vertex AI and fully
                  self-hosted deployments are available for stricter requirements.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right — graphic, then heading + description for the active row */}
          <div className="flex flex-col border-l border-border">
            {/* Graphic placeholder — drop a per-feature asset here later */}
            <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-t border-border bg-muted">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeFeature.key}
                  src={activeFeature.img}
                  alt=""
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 h-full w-full select-none object-cover"
                />
              </AnimatePresence>
            </div>

            {/* Heading + description — wrapper holds a fixed min-height so the
                cell stays constant regardless of which feature's copy is shown
                (shorter ones no longer shrink the column). */}
            <div className="relative min-h-[270px] flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="p-5 py-7 pt-12"
                >
                  <h3 className="text-xl font-medium leading-snug tracking-tight text-foreground">
                    {activeFeature.heading}
                  </h3>
                  <p className="mt-5 max-w-xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
                    {activeFeature.desc}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </SectionFrame>
  );
}
