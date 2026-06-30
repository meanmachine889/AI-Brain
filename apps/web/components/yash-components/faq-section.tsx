"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";

import { SectionFrame } from "@/components/yash-components/section-frame";

// Answers grounded in the real product (SECURITY-OVERVIEW.md, the docs).
const FAQS: { q: string; a: string }[] = [
  {
    q: "Which tools does Neuron connect to?",
    a: "Slack, Gmail, and Jira are live today. You connect them once with OAuth and Neuron keeps reading them for you. Google Drive is next on the roadmap.",
  },
  {
    q: "Can another agency ever see our data?",
    a: "No. Each agency is walled off by Postgres Row-Level Security, a rule the database itself enforces on every query. Even if our application code had a bug, the database would still refuse to return another agency's data.",
  },
  {
    q: "Do you train AI models on our data?",
    a: "No. Summaries and answers are processed by Google's Gemini API on the paid tier, where your data is never used to train models. Vertex AI and fully self-hosted deployments are available for stricter requirements.",
  },
  {
    q: "What happens when we disconnect a client?",
    a: "Deleting a client cascades. Every message, email, summary, and alert we stored for them is removed, and disconnecting an integration revokes the token at the provider. That is how we satisfy right-to-erasure.",
  },
  {
    q: "Can I control who on my team sees which client?",
    a: "Yes. The owner grants access per client as an admin or viewer, and every view and question is recorded in an audit trail the owner can review on a dedicated Activity page.",
  },
  {
    q: "How much does it cost?",
    a: "Pricing is flat per agency, not per seat. You can start free on a single client, and the paid plan comes with a 14-day trial with no card required.",
  },
];

function FaqRow({
  faq,
  isOpen,
  onToggle,
}: {
  faq: { q: string; a: string };
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-6 py-6 text-left"
      >
        <span className="text-base font-medium text-foreground sm:text-lg">
          {faq.q}
        </span>
        <Plus
          className={`size-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-45" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pb-6 text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqSection() {
  const [open, setOpen] = useState<string | null>(FAQS[0].q);

  return (
    <SectionFrame
      className="font-[family-name:var(--font-poppins)]"
      innerClassName="py-16 md:py-20"
    >
      <section id="faq">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-medium leading-tight tracking-tight text-foreground">
            Questions, answered.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
            The things teams ask before trusting Neuron with their clients&apos;
            data.
          </p>
        </motion.div>

        <div className="mx-auto mt-12 max-w-3xl border-t border-border">
          {FAQS.map((faq) => (
            <FaqRow
              key={faq.q}
              faq={faq}
              isOpen={open === faq.q}
              onToggle={() => setOpen(open === faq.q ? null : faq.q)}
            />
          ))}
        </div>
      </section>
    </SectionFrame>
  );
}
