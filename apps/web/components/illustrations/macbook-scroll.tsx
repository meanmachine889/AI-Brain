"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "motion/react";

// ── Neuron mark (no box) ───────────────────────────────────────────────────
function NeuronMarkTiny() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-3.5 text-white" aria-hidden>
      <line x1="10" y1="2.5" x2="10" y2="17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="7.5" x2="4.5" y2="2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10" y1="7.5" x2="15.5" y2="2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10" y1="12.5" x2="4.5" y2="17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10" y1="12.5" x2="15.5" y2="17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="10" r="2.2" fill="currentColor" />
    </svg>
  );
}

// ── Integration dots in sidebar ────────────────────────────────────────────
function IntDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-[2px]">
      <span className="size-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[7.5px] text-white/40">{label}</span>
    </div>
  );
}

// ── Dashboard screen content (pixel-faithful to dashboard-1/2 reference) ──
function DashboardScreen() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0f1012] select-none">

      {/* Rail — very dark, icons only */}
      <div className="w-[44px] shrink-0 bg-[#09090b] flex flex-col items-center py-3 gap-2.5 border-r border-white/[0.04]">
        <NeuronMarkTiny />
        {/* Workspace badge */}
        <div className="mt-0.5 size-6 rounded-md bg-rose-500 flex items-center justify-center text-[7.5px] font-bold text-white">P</div>
        {/* Add */}
        <div className="size-5 rounded border border-white/[0.08] flex items-center justify-center text-white/20 text-base leading-none">+</div>

        {/* Integration icons in rail */}
        <div className="mt-auto space-y-2.5 pb-2 flex flex-col items-center">
          {/* Slack */}
          <svg viewBox="0 0 2447.6 2452.5" className="size-3.5" xmlns="http://www.w3.org/2000/svg">
            <g clipRule="evenodd" fillRule="evenodd">
              <path d="m897.4 0c-135.3.1-244.8 109.9-244.7 245.2-.1 135.3 109.5 245.1 244.8 245.2h244.8v-245.1c.1-135.3-109.5-245.1-244.9-245.3.1 0 .1 0 0 0m0 654h-652.6c-135.3.1-244.9 109.9-244.8 245.2-.2 135.3 109.4 245.1 244.7 245.3h652.7c135.3-.1 244.9-109.9 244.8-245.2.1-135.4-109.5-245.2-244.8-245.3z" fill="#36c5f0"/>
              <path d="m2447.6 899.2c.1-135.3-109.5-245.1-244.8-245.2-135.3.1-244.9 109.9-244.8 245.2v245.3h244.8c135.3-.1 244.9-109.9 244.8-245.3zm-652.7 0v-654c.1-135.2-109.4-245-244.7-245.2-135.3.1-244.9 109.9-244.8 245.2v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.3z" fill="#2eb67d"/>
              <path d="m1550.1 2452.5c135.3-.1 244.9-109.9 244.8-245.2.1-135.3-109.5-245.1-244.8-245.2h-244.8v245.2c-.1 135.2 109.5 245 244.8 245.2zm0-654.1h652.7c135.3-.1 244.9-109.9 244.8-245.2.2-135.3-109.4-245.1-244.7-245.3h-652.7c-135.3.1-244.9 109.9-244.8 245.2-.1 135.4 109.4 245.2 244.7 245.3z" fill="#ecb22e"/>
              <path d="m0 1553.2c-.1 135.3 109.5 245.1 244.8 245.2 135.3-.1 244.9-109.9 244.8-245.2v-245.2h-244.8c-135.3.1-244.9 109.9-244.8 245.2zm652.7 0v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.2v-653.9c.2-135.3-109.4-245.1-244.7-245.3-135.4 0-244.9 109.8-244.8 245.1 0 0 0 .1 0 0" fill="#e01e5a"/>
            </g>
          </svg>
          {/* Jira */}
          <svg fill="#0052CC" viewBox="0 0 24 24" className="size-3.5">
            <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z"/>
          </svg>
          {/* Gmail */}
          <svg viewBox="0 0 192 192" fill="none" className="size-3.5">
            <path fill="#fc413d" d="M46 44H8v110c0 6.627 5.373 12 12 12h20a6 6 0 0 0 6-6z"/>
            <path fill="#60d673" d="M146 44h38v110c0 6.627-5.373 12-12 12h-20a6 6 0 0 1-6-6z"/>
            <path fill="#fc413d" d="M39.226 30.456c-8.033-6.752-20.018-5.714-26.77 2.319-6.752 8.032-5.714 20.017 2.319 26.77l76.078 63.949a8 8 0 0 0 10.295 0l76.078-63.95c8.032-6.752 9.07-18.737 2.318-26.77-6.752-8.032-18.737-9.07-26.769-2.318L96 78.18z"/>
          </svg>
          {/* Avatar */}
          <div className="mt-1 size-6 rounded-full bg-[#5e6ad2] flex items-center justify-center text-[6.5px] font-bold text-white">YB</div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-[130px] shrink-0 bg-[#111214] border-r border-white/[0.04] flex flex-col py-2 overflow-hidden">
        <div className="px-2 mb-2">
          <div className="flex items-center gap-1.5 bg-white/[0.07] rounded-md px-2 py-1.5 cursor-pointer">
            <div className="size-4 rounded-[3px] bg-rose-500 flex items-center justify-center text-[7px] font-bold text-white shrink-0">P</div>
            <span className="text-[9px] font-medium text-white/90 truncate">PrimeOne</span>
            <svg viewBox="0 0 16 16" className="size-2.5 text-white/25 ml-auto shrink-0">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        <div className="px-3 text-[6.5px] text-white/20 uppercase tracking-widest mb-1">Workspace</div>
        <div className="space-y-px px-1.5">
          {[
            { label: "Home", active: true },
            { label: "Attention", badge: "6" },
            { label: "Sync" },
            { label: "Configuration" },
            { label: "Members" },
          ].map(item => (
            <div key={item.label}
              className={`flex items-center justify-between px-2 py-[5px] rounded-[5px] text-[8.5px] cursor-pointer transition-colors duration-100 ${
                item.active ? "bg-white/[0.09] text-white" : "text-white/40 hover:bg-white/[0.04] hover:text-white/60"
              }`}
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="min-w-[14px] h-[14px] rounded-full bg-[#5e6ad2] text-[6px] flex items-center justify-center text-white px-0.5">{item.badge}</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 px-3">
          <div className="text-[6.5px] text-white/18 uppercase tracking-widest mb-1">Integrations</div>
          <IntDot color="#36c5f0" label="Slack" />
          <IntDot color="#0052cc" label="Jira" />
          <IntDot color="#fc413d" label="Gmail" />
          <IntDot color="#0ebc5f" label="Drive" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-5 pt-3 pb-1.5">
          <div className="text-[7px] text-white/22 uppercase tracking-widest">PrimeOne · Current Status</div>
        </div>

        <div className="flex-1 overflow-hidden px-5 py-2 space-y-2.5">
          {/* Summary */}
          <p className="text-[9px] text-white/68 leading-[1.7]">
            Here&apos;s a summary of the recent activity for PrimeOne: PrimeOne&apos;s launch is targeted for next Friday,
            but the footer <span className="text-white/45">(KAN-2)</span> is a long pole and the mobile layout bug{" "}
            <span className="text-white/45">(KAN-4)</span> is still in progress, with the client having flagged it as broken.
            We are currently blocked waiting on their brand asset pack.
          </p>
          <div className="text-[7px] text-white/22">Generated 24h ago · 17 items</div>

          {/* Source chips */}
          <div className="flex flex-wrap gap-1">
            {["Slack · 2h ago", "Jira · KAN-4", "Gmail · Yesterday", "Slack · 3d ago"].map(c => (
              <span key={c} className="rounded bg-white/[0.035] border border-white/[0.05] px-1.5 py-[2px] text-[7px] font-mono text-white/30">{c}</span>
            ))}
          </div>

          {/* User Q */}
          <div className="flex justify-end">
            <div className="rounded-xl rounded-br-sm bg-[#1c1f24] border border-white/[0.06] px-3 py-1.5 text-[8.5px] text-white/75">
              what is the status?
            </div>
          </div>

          {/* AI response */}
          <p className="text-[9px] text-white/62 leading-[1.7]">
            PrimeOne&apos;s launch is targeted for next Friday{" "}
            <span className="text-white/30 text-[7px]">(Slack, 2026-06-02)</span>. The client is unhappy with the mobile layout.
            Yash Bharadwaj still owes the client revised mockups and an updated invoice by EOD today.
          </p>

          {/* Blockers */}
          <div className="text-[8.5px] leading-[1.65] text-white/50 space-y-0.5">
            <p><span className="text-rose-400 font-medium">Blocked:</span> Waiting on brand asset pack <span className="text-white/25 text-[7px]">(Slack, 2026-05-30)</span></p>
            <p><span className="text-amber-400 font-medium">KAN-4:</span> Mobile layout bug overdue · Yash Bharadwaj</p>
            <p><span className="text-amber-400 font-medium">KAN-2:</span> Footer section unassigned · due 2026-06-11</p>
          </div>
        </div>

        {/* Ask bar */}
        <div className="px-4 py-2.5 border-t border-white/[0.04]">
          <div className="group/ask flex items-center gap-2 bg-[#16181b] border border-white/[0.06] hover:border-indigo/40 rounded-xl px-3 py-1.5 cursor-text transition-colors duration-150 hover:shadow-[0_0_0_2px_rgba(94,106,210,0.08)]">
            <svg viewBox="0 0 16 16" className="size-3 text-white/20 shrink-0">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
              <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="text-[8.5px] text-white/22 flex-1 flex items-center gap-0.5">
              Ask anything...
              <span className="inline-block h-[9px] w-[1.5px] bg-white/30 animate-pulse ml-0.5" />
            </span>
            <div className="size-5 rounded-lg bg-white/[0.06] flex items-center justify-center">
              <svg viewBox="0 0 12 12" className="size-2.5 text-white/35" fill="none">
                <path d="M6 9V3M3 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="text-center text-[6px] text-white/12 mt-1">Grounded in PrimeOne activity · may be imperfect</p>
        </div>
      </div>
    </div>
  );
}

// ── MacBook scroll reveal component ──────────────────────────────────────────
export function MacbookScroll() {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.95", "start 0.15"],
  });

  const rawScale = useTransform(scrollYProgress, [0, 1], [0.88, 1]);
  const rawOpacity = useTransform(scrollYProgress, [0, 0.25], [0, 1]);
  const rawY = useTransform(scrollYProgress, [0, 1], [48, 0]);

  const scale = useSpring(rawScale, { stiffness: 70, damping: 18 });
  const opacity = useSpring(rawOpacity, { stiffness: 70, damping: 18 });
  const y = useSpring(rawY, { stiffness: 70, damping: 18 });

  return (
    <div ref={ref} className="relative py-6 overflow-hidden">
      <motion.div
        style={{ scale, opacity, y }}
        className="mx-auto w-full max-w-4xl px-6 md:px-8"
      >
        {/* Lid / Screen */}
        <div
          className="relative rounded-t-[16px]"
          style={{
            background: "linear-gradient(165deg, #e2e2e2 0%, #b8b8b8 100%)",
            padding: "3px 3px 0 3px",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.13)," +
              "0 1px 0 rgba(255,255,255,0.6) inset," +
              "0 28px 80px rgba(0,0,0,0.20)," +
              "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {/* Camera */}
          <div className="absolute top-[7px] left-1/2 -translate-x-1/2 size-[7px] rounded-full bg-[#282828] ring-[1.5px] ring-black/30 z-10" />

          {/* Screen bezel + content */}
          <div
            className="rounded-t-[13px] overflow-hidden bg-[#0f1012]"
            style={{ aspectRatio: "16/10" }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 bg-[#18191c] px-3 py-[7px] border-b border-white/[0.04]">
              <span className="size-[9px] rounded-full bg-[#ff5f57]" />
              <span className="size-[9px] rounded-full bg-[#febc2e]" />
              <span className="size-[9px] rounded-full bg-[#28c840]" />
              <div className="mx-3 flex-1 flex justify-center">
                <div className="flex items-center gap-1.5 bg-[#25262a] rounded-[5px] px-3 py-[3px] text-[8px] font-mono text-white/35 max-w-[180px] w-full justify-center">
                  <span className="size-[5px] rounded-full bg-emerald-500/50" />
                  localhost:3000
                </div>
              </div>
            </div>
            {/* Dashboard */}
            <div className="h-[calc(100%-27px)]">
              <DashboardScreen />
            </div>
          </div>
        </div>

        {/* Hinge seam */}
        <div
          style={{
            height: "4px",
            background: "linear-gradient(to bottom, #b0b0b0, #9a9a9a)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          }}
        />

        {/* Bottom base */}
        <div
          className="rounded-b-[16px] h-10 flex items-end justify-center pb-2.5 relative"
          style={{
            background: "linear-gradient(to bottom, #b2b2b2 0%, #9c9c9c 100%)",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.10)," +
              "0 1px 0 rgba(255,255,255,0.25) inset," +
              "0 8px 24px rgba(0,0,0,0.14)",
          }}
        >
          {/* Trackpad */}
          <div
            className="w-[80px] h-[18px] rounded-[4px]"
            style={{
              background: "linear-gradient(135deg, #adadad, #9a9a9a)",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          />
        </div>

        {/* Subtle reflection / table shadow */}
        <div
          className="mt-1 mx-8 h-4 rounded-b-full"
          style={{
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.10) 0%, transparent 70%)",
          }}
        />
      </motion.div>
    </div>
  );
}
