"use client";

import { motion } from "motion/react";

import { SectionFrame } from "@/components/yash-components/section-frame";

// "What is Neuron" — intro section. Heading on the left, two problem/solution
// paragraphs on the right (bold dark lead-in + muted gray continuation).
export function AboutSection() {
  return (
    <SectionFrame className="font-[family-name:var(--font-poppins)]" innerClassName="py-20 md:py-28">
      <div className="grid gap-8 px-9 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-base font-medium tracking-tight text-foreground sm:text-lg"
        >
          What is Neuron
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-xl space-y-6 text-base font-light leading-relaxed text-muted-foreground sm:text-lg"
        >
          <p>
            <span className="font-medium text-foreground">Agency context is scattered.</span>{" "}
            Every client lives across Slack, Gmail, and Jira, and PMs lose 30
            minutes digging through all of it before every status call.
          </p>
          <p>
            <span className="font-medium text-foreground">Neuron connects those tools and reads everything for you.</span>{" "}
            Ask a question in plain English and get an answer in seconds, cited to
            the exact Slack message or Jira ticket. It also flags what needs
            attention each day: silent clients, overdue tickets, looming deadlines.
          </p>
        </motion.div>
      </div>
    </SectionFrame>
  );
}
