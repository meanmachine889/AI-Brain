"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

// Full-bleed CTA — intentionally NOT inside SectionFrame, so it spans the whole
// page width as a closing band over the dusk-gradient bg image.
export function CtaSection() {
  return (
    <section
      className="relative w-full overflow-hidden border-t border-border bg-cover bg-center font-[family-name:var(--font-poppins)]"
      style={{ backgroundImage: "url('/cta%20assets/bg.png')" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="relative mx-auto max-w-3xl px-6 py-28 text-center md:py-32"
      >
        <h2 className="text-3xl font-medium leading-tight tracking-tight text-white sm:text-4xl">
          Stop prepping. Start knowing.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-base font-light leading-relaxed text-white/70">
          Join agency teams who have eliminated pre-call context gathering
          completely.
        </p>
        <Link
          href="/login"
          className="group mt-9 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-7 text-sm font-medium text-[#1a1a1a] shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/90 active:scale-[0.98]"
        >
          Get started
          <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </motion.div>
    </section>
  );
}
