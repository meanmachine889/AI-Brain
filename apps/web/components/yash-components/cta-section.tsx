"use client";

import { useState } from "react";
import { motion } from "motion/react";

// X (formerly Twitter) logomark.
function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Full-bleed closing band over the dusk-gradient bg image. Doubles as the
// page footer: holds the waitlist headline, email capture, and the X follow
// line — the old links-only <Footer> was dropped.
export function CtaSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Please enter a valid email.");
      return;
    }
    setError("");
    // No backend waitlist endpoint yet — capture on the client and confirm.
    // Wire to POST /waitlist when the endpoint exists.
    setSubmitted(true);
  }

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
        className="relative mx-auto max-w-3xl px-6 py-20 text-center md:py-24"
      >
        <h2 className="text-3xl font-medium leading-tight tracking-tight text-white sm:text-4xl">
          Stop prepping. Start knowing.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-base font-light leading-relaxed text-white/70">
          Join the waitlist and we&apos;ll reach out when your spot opens.
        </p>

        <div className="mx-auto mt-9 w-full max-w-[400px]">
          {submitted ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-white/90 px-5 py-3.5 text-sm font-medium text-[#1a1a1a] shadow-lg backdrop-blur-md">
              You&apos;re on the list — we&apos;ll be in touch.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 rounded-xl bg-white/95 p-1 shadow-lg backdrop-blur-md transition focus-within:ring-2 focus-within:ring-white/60">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Email"
                  aria-label="Email"
                  className="min-w-0 flex-1 bg-transparent px-3.5 text-sm text-[#1a1a1a] placeholder:text-[#1a1a1a]/40 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-[#1a1a1a] px-6 py-2.5 text-sm text-white transition-all hover:bg-[#2a2a2a] active:scale-[0.98]"
                >
                  Join
                </button>
              </div>
              {error && (
                <p className="text-left text-xs text-red-200">{error}</p>
              )}
            </form>
          )}
        </div>

        {/* Follow on X for updates */}
        <a
          href="https://x.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-8 inline-flex items-center gap-2 text-sm font-light text-white/60 transition-colors hover:text-white"
        >
          <XLogo className="size-4" />
          Follow us on X for updates
        </a>
      </motion.div>
    </section>
  );
}
