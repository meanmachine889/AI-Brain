"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { Logo } from "@/components/logo";

// Asset paths (folder name has a space → URL-encode it).
const CLOUDS_BG = "/hero%20assets/image.png";
const DASHBOARD = "/hero%20assets/dashboard.png";

// Aside-inspired hero: a rounded cloud panel holds the nav, headline and CTA,
// with the product dashboard image placed over the lower half of the clouds.
export function HeroAside() {
  return (
    <section className="px-3 pt-3 font-[family-name:var(--font-poppins)] sm:px-4 sm:pt-4">
      {/* ── Rounded cloud panel — taller than the viewport, clouds cover ── */}
      <div className="relative h-[125vh] min-h-[900px] overflow-hidden rounded-[1.75rem] sm:rounded-[2.25rem]">
        {/* Clouds cover the whole panel */}
        <img
          src={CLOUDS_BG}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full select-none object-cover"
        />

        {/* ── Foreground content, absolutely layered over the clouds ────── */}
        <div className="absolute inset-0 z-10 flex flex-col">
          {/* Nav (transparent, sitting on the sky) */}
          <header className="pt-1">
            <div className="flex h-14 items-center justify-between px-6 sm:h-16 sm:px-10">
              {/* Logo — far left */}
              <div className="flex items-center gap-2 text-[#0b1220]">
                <Logo className="size-10" />
                <span className="text-sm font-medium tracking-tight sm:text-base">Neuron</span>
              </div>

              {/* Nav links — center */}
              <nav className="hidden items-center gap-8 text-[13px] font-normal text-[#0b1220]/70 md:flex">
                <a href="#features" className="transition-colors hover:text-[#0b1220]">Features</a>
                <a href="#demo" className="transition-colors hover:text-[#0b1220]">Demo</a>
                <a href="#pricing" className="transition-colors hover:text-[#0b1220]">Pricing</a>
              </nav>

              {/* Login — far right */}
              <Link
                href="/login"
                className="flex h-8 items-center rounded-full bg-[#0b1220] px-4 text-[12px] font-medium text-white transition-transform hover:-translate-y-0.5 active:scale-[0.98] sm:h-9 sm:text-[13px]"
              >
                Login
              </Link>
            </div>
          </header>

          {/* Hero copy — upper area of the clouds */}
          <div className="mx-auto mt-[5vw] max-w-3xl px-6 text-center sm:mt-[4vw]">
            {/* Headline — Poppins, light + minimal */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="text-[1.6rem] font-normal leading-[1.12] tracking-tight text-[#0b1220] sm:text-[2.1rem] md:text-[2.6rem]"
            >
              The shared memory layer
              <br className="hidden sm:block" />for digital agencies.
            </motion.h1>

            {/* Single CTA */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="mt-5 sm:mt-6"
            >
              <Link
                href="/waitlist"
                className="group inline-flex h-10 items-center gap-2 mt-5 rounded-full bg-[#0b1220] px-6 text-[13px] font-medium text-white transition-transform hover:-translate-y-0.5 active:scale-[0.98] sm:h-11 sm:text-sm"
              >
                Get Started
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>

          {/* Dashboard image — stuck to the bottom, bottom edge clipped by
              the panel's rounded corners */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mt-auto px-4 sm:px-10"
          >
            <img
              src={DASHBOARD}
              alt="Neuron dashboard — the per-client Attention feed surfacing overdue tickets, blockers, and silent clients."
              className="mx-auto block w-full max-w-7xl select-none -mb-20"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
