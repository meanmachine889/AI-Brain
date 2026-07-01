"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Logo } from "@/components/logo";

export default function WaitlistPage() {
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
    <main className="relative flex min-h-svh flex-col overflow-hidden font-[family-name:var(--font-poppins)]">
      {/* full-screen background photo — zoomed in slightly and anchored low so
          more of the green field shows and the bottom edge is cropped. */}
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: "url('/auth-bg.jpg')",
          backgroundSize: "115%",
          backgroundPosition: "center 85%",
        }}
      />
      {/* soft light scrim so text stays legible over the sky */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/25 to-white/10" />

      {/* centered content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.04, ease: "easeOut" }}
          className="text-[1.9rem] font-normal leading-[1.15] tracking-tight text-[#1a2230] sm:text-[2.4rem]"
        >
          <span className="inline-flex items-center gap-2.5 align-middle">
            Neuron
            <Logo className="size-14" />
          </span>{" "}
          is under
          <br />
          active development.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
          className="mt-4 max-w-sm text-[13px] font-light leading-relaxed text-[#1a2230]/60"
        >
          The shared memory layer for digital agencies. Join the waitlist and
          we&apos;ll reach out when your spot opens.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease: "easeOut" }}
          className="mt-9 w-full max-w-[380px]"
        >
          {submitted ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-white/70 px-5 py-3.5 text-sm font-normal text-[#1a2230] shadow-sm ring-1 ring-black/[0.06] backdrop-blur-md">
              You&apos;re on the list — we&apos;ll be in touch.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 rounded-xl bg-white/90  p-1 shadow-sm ring-1 ring-black/[0.06] backdrop-blur-md transition focus-within:ring-[#5e6ad2]/40">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Email"
                  aria-label="Email"
                  className="min-w-0 flex-1 bg-transparent px-2 text-sm text-[#1a2230] placeholder:text-[#1a2230]/40 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-blue-500 px-6 py-2.5 text-sm text-white transition-all hover:bg-[#4f5bc4] active:scale-[0.98]"
                >
                  Join
                </button>
              </div>
              {error && (
                <p className="text-left text-xs text-[#c0392b]">{error}</p>
              )}
            </form>
          )}
        </motion.div>
      </div>

      {/* footer */}
      <footer className="relative z-10 flex flex-col items-center gap-2.5 pb-8 text-center">
        <nav className="flex items-center gap-5 text-xs text-[#1a2230]/55">
          <Link href="/" className="transition-colors hover:text-[#1a2230]">
            Home
          </Link>
          <span className="cursor-pointer transition-colors hover:text-[#1a2230]">
            Privacy
          </span>
          <span className="cursor-pointer transition-colors hover:text-[#1a2230]">
            Terms
          </span>
          <Link href="/login" className="transition-colors hover:text-[#1a2230]">
            Sign in
          </Link>
        </nav>
      </footer>
    </main>
  );
}
