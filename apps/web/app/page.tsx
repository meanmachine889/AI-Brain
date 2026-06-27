"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";
import {
  ArrowRight,
  MessageSquare,
  Mail,
  Sparkles,
  Clock,
  Search,
  FolderDot,
  Zap,
  Shield,
  ChevronRight,
} from "lucide-react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

import { IntegrationsOrbit } from "@/components/illustrations/integrations-orbit";
import { BrainHalftone } from "@/components/illustrations/brain-halftone";
import { RecallChart } from "@/components/illustrations/recall-chart";
import { ServerIsometric } from "@/components/illustrations/server-isometric";
import { MacbookScroll } from "@/components/illustrations/macbook-scroll";
import { Pricing } from "@/components/sections/pricing";
import { Footer } from "@/components/sections/footer";
import { HeroAside } from "@/components/sections/hero-aside";
import { AboutSection } from "@/components/yash-components/about-section";
import { IntegrationsSection } from "@/components/yash-components/integrations-section";

import {
  SlackIcon,
  JiraIcon,
  GmailIcon,
  DriveIcon,
  NotionLogoIcon,
  LinearLogoIcon,
  OutlookLogoIcon,
  GitHubLogoIcon,
} from "@/components/brand-icons";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Marquee } from "@/components/ui/marquee";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { PointerHighlight } from "@/components/ui/pointer-highlight";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { GsapParallaxHero } from "@/components/ui/gsap-parallax";
import { GsapScrollReveal } from "@/components/ui/gsap-scroll-reveal";

// ── Neuron SVG logomark (no bounding box) ────────────────────────────────────
function NeuronMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden>
      <line x1="14" y1="3" x2="14" y2="25" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="14" y1="9.5" x2="6.5" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="9.5" x2="21.5" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="18.5" x2="6.5" y2="25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="18.5" x2="21.5" y2="25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="3" r="1.8" fill="currentColor" />
      <circle cx="14" cy="25" r="1.8" fill="currentColor" />
      <circle cx="6.5" cy="3" r="1.8" fill="currentColor" />
      <circle cx="21.5" cy="3" r="1.8" fill="currentColor" />
      <circle cx="6.5" cy="25" r="1.8" fill="currentColor" />
      <circle cx="21.5" cy="25" r="1.8" fill="currentColor" />
      <circle cx="14" cy="14" r="2.6" fill="currentColor" />
    </svg>
  );
}

// ── Hero word-reveal animation helpers ───────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const heroContainer: any = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const heroWord: any = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "circOut" } },
};

// ── Q&A demo presets ────────────────────────────────────────────────────────

const PRESETS = [
  {
    question: "What did we promise Acme by Friday?",
    answer:
      "Based on recent project discussions, you promised Acme Corp the **final mobile Figma mockups** and the **database schema sign-off** by Friday at 5:00 PM. John confirmed on Slack that the design files are ready, but Sarah is still waiting on client feedback for the schema.",
    sources: [
      {
        type: "slack",
        label: "Slack · 2h ago",
        text: "[John]: Mobile mockups are ready in Figma...",
      },
      {
        type: "gmail",
        label: "Gmail · Yesterday",
        text: "Subject: Database schema update. [Sarah]: Waiting on sign-off...",
      },
    ],
  },
  {
    question: "What's blocking the Vela integration?",
    answer:
      "The Vela integration is currently blocked by a **missing Google OAuth Client ID** in production. According to the Jira ticket **VEL-142**, developer Rahul noted that the client has not shared access to their Google Cloud console yet. A follow-up email was sent by PM Priya yesterday.",
    sources: [
      {
        type: "jira",
        label: "Jira · VEL-142",
        text: "Rahul: Blocked on client console access.",
      },
      {
        type: "gmail",
        label: "Gmail · 18h ago",
        text: "From Priya to client: Requesting GCP credentials...",
      },
    ],
  },
  {
    question: "Is there any scope creep on Cluely?",
    answer:
      "Yes, potential scope creep detected. In Slack thread **#cluely-dev**, the client requested an **analytics dashboard module** which was not in the original project brief. A Jira comment on **CL-88** also mentions Rahul estimating this will add 12 dev-hours, but it has not been billed yet.",
    sources: [
      {
        type: "slack",
        label: "Slack · #cluely-dev",
        text: "Client: Can we also add a quick charts view?",
      },
      {
        type: "jira",
        label: "Jira · CL-88",
        text: "Rahul: Added subtask for charts module (12h).",
      },
    ],
  },
];

// ── Stats ────────────────────────────────────────────────────────────────────

const STATS = [
  { value: 30, suffix: " min", label: "saved per PM, per client day" },
  { value: 15, suffix: "+", label: "active client streams supported" },
  { value: 3, suffix: "s", label: "average context retrieval time" },
];

// ── Feature cards ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Slack & Email Sync",
    description:
      "All client conversations ingested and indexed automatically. No manual uploads, no copy-paste.",
    accent: "bg-sky-50 dark:bg-sky-950/30",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  {
    icon: Search,
    title: "Natural Language Q&A",
    description:
      'Ask "What did we promise Acme by Friday?" and get a cited answer in under 3 seconds.',
    accent: "bg-indigo-50 dark:bg-indigo-950/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    icon: Clock,
    title: "Daily Attention Feed",
    description:
      "A morning briefing of what needs action across all clients — before you open Slack.",
    accent: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-600 dark:text-amber-500",
  },
  {
    icon: FolderDot,
    title: "Client Brain Records",
    description:
      "One unified intelligence file per client: history, blockers, people, and commitments.",
    accent: "bg-violet-50 dark:bg-violet-950/30",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    icon: Zap,
    title: "Scope Creep Alerts",
    description:
      "Automatically flags new work requests against the original project brief.",
    accent: "bg-rose-50 dark:bg-rose-950/30",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    icon: Shield,
    title: "Postgres RLS Isolation",
    description:
      "Each agency's data is completely isolated at the database level. We never cross-contaminate client data.",
    accent: "bg-emerald-50 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 dark:text-emerald-500",
  },
];


// ── Neural network ASCII illustration (SVG) ──────────────────────────────────

function NeuralNetworkSVG() {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });

  const nodes = [
    // Layer 1 (inputs)
    { x: 60, y: 80 }, { x: 60, y: 160 }, { x: 60, y: 240 }, { x: 60, y: 320 },
    // Layer 2 (hidden)
    { x: 190, y: 110 }, { x: 190, y: 200 }, { x: 190, y: 290 },
    // Layer 3 (hidden)
    { x: 320, y: 130 }, { x: 320, y: 200 }, { x: 320, y: 270 },
    // Layer 4 (output)
    { x: 450, y: 160 }, { x: 450, y: 240 },
  ];

  const connections = [
    // L1→L2
    [0,4],[0,5],[1,4],[1,5],[1,6],[2,4],[2,5],[2,6],[3,5],[3,6],
    // L2→L3
    [4,7],[4,8],[5,7],[5,8],[5,9],[6,8],[6,9],
    // L3→L4
    [7,10],[7,11],[8,10],[8,11],[9,10],[9,11],
  ];

  // Select connections that get animated pulse particles
  const pulseConnections = [[0,4],[1,5],[2,6],[4,7],[5,8],[6,9],[7,10],[9,11]];

  const inputLabels = ["Slack", "Gmail", "Jira", "Drive"];
  const outputLabels = ["Context", "Alerts"];

  return (
    <svg ref={ref} viewBox="0 0 520 400" className="w-full h-full select-none" aria-hidden>
      <defs>
        <linearGradient id="nn-edge" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5e6ad2" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#5e6ad2" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="nn-node-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5e6ad2" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#5e6ad2" stopOpacity="0" />
        </radialGradient>
        <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Path definitions for pulse particle motion */}
        {pulseConnections.map(([from, to], i) => (
          <path
            key={`path-def-${i}`}
            id={`path-${from}-${to}-${i}`}
            d={`M ${nodes[from].x} ${nodes[from].y} L ${nodes[to].x} ${nodes[to].y}`}
            fill="none"
          />
        ))}
      </defs>

      {/* ASCII-style grid background */}
      <pattern id="nn-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.08" />
      </pattern>
      <rect width="520" height="400" fill="url(#nn-grid)" />

      {/* Connections with draw-on animation */}
      {connections.map(([from, to], i) => (
        <line
          key={i}
          x1={nodes[from].x} y1={nodes[from].y}
          x2={nodes[to].x} y2={nodes[to].y}
          stroke="url(#nn-edge)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="200"
          style={{
            strokeDashoffset: isInView ? 0 : 200,
            transition: `stroke-dashoffset 0.9s ease ${(0.1 + i * 0.12).toFixed(2)}s`,
          }}
        />
      ))}

      {/* Animated pulse particles on select connections */}
      {pulseConnections.map(([from, to], i) => (
        <circle key={`pulse-${i}`} r="2" fill="#5e6ad2" opacity="0.7">
          <animate
            attributeName="fill"
            values="#5e6ad2;#a5b4fc;#818cf8;#5e6ad2"
            dur="3s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"
          />
          <animateMotion
            dur={`${1.8 + i * 0.3}s`}
            repeatCount="indefinite"
            begin={`${i * 0.4}s`}
          >
            <mpath href={`#path-${from}-${to}-${i}`} />
          </animateMotion>
        </circle>
      ))}

      {/* Nodes with glow filter */}
      {nodes.map((node, i) => (
        <g key={i}>
          <circle cx={node.x} cy={node.y} r="10" fill="url(#nn-node-glow)" />
          <circle
            cx={node.x} cy={node.y} r="6"
            fill="rgba(94,106,210,0.9)"
            stroke="#5e6ad2"
            strokeWidth="1.5"
            filter="url(#node-glow)"
          />
          {/* Animated pulse for output nodes */}
          {i >= 10 && (
            <circle cx={node.x} cy={node.y} r="6" fill="none" stroke="#5e6ad2" strokeWidth="1">
              <animate attributeName="r" values="6;14;6" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      ))}

      {/* Input labels */}
      {inputLabels.map((label, i) => (
        <text key={label} x="18" y={nodes[i].y + 4}
          fontSize="9" fontFamily="monospace" fontWeight="500"
          fill="currentColor" opacity="0.5" textAnchor="middle"
        >
          {label}
        </text>
      ))}

      {/* Output labels */}
      {outputLabels.map((label, i) => (
        <text key={label} x="502" y={nodes[10 + i].y + 4}
          fontSize="9" fontFamily="monospace" fontWeight="600"
          fill="#5e6ad2" textAnchor="middle"
        >
          {label}
        </text>
      ))}

      {/* Center label */}
      <text x="260" y="390" fontSize="8" fontFamily="monospace"
        fill="currentColor" opacity="0.3" textAnchor="middle">
        NEURON CONTEXT ENGINE
      </text>
    </svg>
  );
}

// ── Integration logo chip ─────────────────────────────────────────────────────

const MARQUEE_LOGOS: Array<{ icon: React.FC<React.SVGProps<SVGSVGElement>>; name: string }> = [
  { icon: SlackIcon, name: "Slack" },
  { icon: GmailIcon, name: "Gmail" },
  { icon: JiraIcon, name: "Jira" },
  { icon: DriveIcon, name: "Google Drive" },
  { icon: NotionLogoIcon, name: "Notion" },
  { icon: LinearLogoIcon, name: "Linear" },
  { icon: OutlookLogoIcon, name: "Outlook" },
  { icon: GitHubLogoIcon, name: "GitHub" },
];

// ── Main component ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [activePreset, setActivePreset] = useState(0);
  const [simText, setSimText] = useState("");
  const [simStage, setSimStage] = useState<"idle" | "typing" | "thinking" | "done">("idle");
  const [simSources, setSimSources] = useState<(typeof PRESETS)[0]["sources"]>([]);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    } else {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    if (checking || simStage !== "typing") return;
    const fullAnswer = PRESETS[activePreset].answer;
    let index = 0;
    setSimText("");
    setSimSources([]);

    const interval = setInterval(() => {
      if (index < fullAnswer.length) {
        setSimText((prev) => prev + fullAnswer.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        setSimStage("done");
        setSimSources(PRESETS[activePreset].sources);
      }
    }, 10);
    return () => clearInterval(interval);
  }, [checking, activePreset, simStage]);

  const handleSelectPreset = (idx: number) => {
    setActivePreset(idx);
    setSimStage("thinking");
    setTimeout(() => setSimStage("typing"), 750);
  };

  useEffect(() => {
    if (!checking && simStage === "idle") handleSelectPreset(0);
  }, [checking, simStage]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-2 border-indigo border-t-transparent" />
          <p className="text-xs text-muted-foreground tracking-widest uppercase font-mono">
            Connecting Core
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── New Aside-style hero (replaces old nav + hero below) ─────────── */}
      <HeroAside />

      {/* ── What is Neuron — intro ──────────────────────────────────────── */}
      <AboutSection />

      {/* ── OLD nav + hero — kept for reference, not rendered ────────────── */}
      {false && (
      <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">

          <div className="flex items-center gap-2">
            <NeuronMark className="size-7 text-foreground" />
            <span className="text-sm font-bold tracking-tight font-display">Neuron</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-[13px] text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#demo" className="hover:text-foreground transition-colors">Demo</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle className="size-8 text-muted-foreground hover:text-foreground rounded-lg" />
            <Link href="/login" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
              Sign In
            </Link>
            <Link
              href="/login"
              className="cta-lime flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-[12px] font-semibold shadow-depth transition-all"
            >
              Get Started <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section id="hero-section" className="relative overflow-hidden min-h-[85vh]">
        {/* Animated ripple background */}
        <div id="hero-grid" className="pointer-events-none absolute inset-0 overflow-hidden">
          <BackgroundRippleEffect />
        </div>
        {/* Bottom gradient blend to next section */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-background to-transparent" />

        <div className="relative mx-auto w-full max-w-5xl px-6 text-center pt-20 pb-24 md:pt-28 md:pb-28">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-white dark:bg-card px-4 py-1.5 text-[11px] font-medium text-muted-foreground shadow-soft"
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald" />
            </span>
            Live sync: Slack · Gmail · Jira · Google Drive
          </motion.div>

          {/* Hero heading — staggered word reveal */}
          <motion.h1
            variants={heroContainer}
            initial="hidden"
            animate="visible"
            data-gsap-reveal
            className="font-display text-[3.2rem] font-bold tracking-tight text-foreground sm:text-7xl md:text-[5.25rem] lg:text-[6rem] leading-[0.88] max-w-4xl mx-auto"
          >
            {["The", "shared"].map((w) => (
              <motion.span key={w} variants={heroWord} className="inline-block mr-[0.22em]">{w}</motion.span>
            ))}
            <PointerHighlight
              rectangleClassName="border-indigo/40 dark:border-indigo/40"
              pointerClassName="text-indigo"
              containerClassName="inline-block"
            >
              <motion.span
                variants={heroWord}
                className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-indigo to-[#8b95e8] relative z-10"
              >
                memory&nbsp;layer
              </motion.span>
            </PointerHighlight>
            <br className="hidden md:block" />
            {["for", "digital", "agencies"].map((w) => (
              <motion.span key={w} variants={heroWord} className="inline-block mr-[0.22em]">{w}</motion.span>
            ))}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            data-gsap-reveal
            className="mt-7 max-w-xl mx-auto text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            PMs waste 30 minutes per client gathering context before every status call.
            Neuron ingests your tools and answers &quot;what&apos;s happening?&quot; in seconds.
          </motion.p>

          {/* CTAs — with hover animations */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/login"
              className="group relative overflow-hidden flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold bg-foreground text-background shadow-raised hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150"
            >
              {/* Shimmer sweep */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out bg-gradient-to-r from-transparent via-white/15 to-transparent"
              />
              Start 14-day free trial
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-1" />
            </Link>
            <a
              href="#demo"
              className="group relative overflow-hidden flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-white dark:bg-card px-6 text-sm font-medium text-foreground hover:border-foreground/20 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 shadow-soft"
            >
              {/* Background fill on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out bg-muted/70"
              />
              <span className="relative z-10 flex items-center gap-2">
                Try interactive demo
                <ChevronRight className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
              </span>
            </a>
          </motion.div>

          {/* Social proof */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-5 text-xs text-muted-foreground/55"
          >
            Trusted by high-performing agency teams · No credit card required
          </motion.p>
        </div>
        <GsapParallaxHero />
        <GsapScrollReveal />
      </section>

      {/* ── MacBook scroll reveal ────────────────────────────────────────── */}
      <section className="relative border-t border-border/30 bg-gradient-to-b from-background via-muted/20 to-muted/30 py-16">
        <div className="mx-auto max-w-5xl px-6 text-center mb-8">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/55 mb-3"
          >
            Product preview
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Context delivered in seconds
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto"
          >
            Ask anything. Neuron retrieves from Slack, Jira, and Gmail and writes a cited answer.
          </motion.p>
        </div>
        <MacbookScroll />
      </section>
      </>
      )}

      {/* ── Marquee + Stats — kept for reference, not rendered ──────────── */}
      {false && (
      <>
      {/* ── Marquee — integration logos ───────────────────────────────────── */}
      <section className="border-y border-border/40 py-6 overflow-hidden bg-white">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50 mb-5">
          Plugs into the tools your team already uses
        </p>
        <Marquee className="[--duration:32s]" gap="0.75rem">
          {MARQUEE_LOGOS.map((logo) => {
            const Icon = logo.icon;
            return (
              <div
                key={logo.name}
                className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-border/60 bg-white text-foreground/70 text-[13px] font-medium hover:border-border hover:text-foreground transition-colors cursor-default whitespace-nowrap mx-1.5"
              >
                <Icon className="size-4 shrink-0 text-foreground/60" />
                {logo.name}
              </div>
            );
          })}
        </Marquee>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="py-16 border-b border-border/40">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STATS.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="font-display text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
                  <NumberTicker value={stat.value} delay={i * 0.2} />
                  <span className="text-indigo">{stat.suffix}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      </>
      )}

      {/* ── § Integrations ──────────────────────────────────────────────── */}
      <IntegrationsSection />

      {/* ── Interactive Q&A Demo ───────────────────────────────────────────── */}
      <section id="demo" className="mx-auto max-w-5xl px-6 py-20 md:py-24">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Interactive demo
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
            See Neuron in action
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            Click a real-world agency scenario below to see how the RAG engine retrieves and cites relevant context.
          </p>
        </div>

        {/* Preset selector */}
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPreset(idx)}
              className={`text-left p-4 rounded-xl border transition-all text-sm ${
                activePreset === idx
                  ? "bg-white dark:bg-card border-indigo/40 shadow-raised ring-1 ring-indigo/10"
                  : "bg-muted/30 border-border/60 hover:bg-white dark:hover:bg-card hover:border-border hover:shadow-soft"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">
                  Scenario {idx + 1}
                </span>
                {activePreset === idx && (
                  <span className="size-1.5 rounded-full bg-indigo" />
                )}
              </div>
              <p className="font-medium text-foreground leading-snug">{preset.question}</p>
            </button>
          ))}
        </div>

        {/* Terminal */}
        <div className="mt-6 rounded-xl border border-border overflow-hidden shadow-raised">
          {/* Terminal chrome */}
          <div className="flex items-center gap-1.5 bg-[#1a1b1e] px-4 py-2.5 border-b border-white/[0.06]">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-[11px] font-mono text-white/40">neuron · rag-engine</span>
            <span className="ml-auto text-[10px] font-mono text-white/20">
              {simStage === "thinking" ? "latency: …" : "latency: 1.2s"}
            </span>
          </div>

          {/* Terminal body */}
          <div className="bg-[#0f1012] p-5 min-h-[220px] flex flex-col justify-between">
            <div className="space-y-4">
              {/* Question */}
              <div className="flex gap-2.5">
                <span className="text-xs font-mono text-white/40 mt-0.5 shrink-0">PM &gt;</span>
                <p className="text-[13px] font-semibold text-[#8b95e8]">
                  {PRESETS[activePreset].question}
                </p>
              </div>

              {/* Answer */}
              <div className="flex gap-2.5">
                <span className="text-xs font-mono text-[#d3e017] mt-0.5 shrink-0">AI &gt;</span>
                <div className="text-[13px] leading-relaxed text-white/85 min-h-[40px] flex-1">
                  {simStage === "thinking" ? (
                    <div className="flex items-center gap-1.5 text-white/40">
                      <span className="size-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="size-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="size-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                      <span className="text-xs ml-1">Searching pgvector index…</span>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{simText}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Citations */}
            <div className="mt-5 border-t border-white/[0.05] pt-3 flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-mono text-white/30">citations:</span>
              {simStage === "done" &&
                simSources.map((source, j) => (
                  <span
                    key={j}
                    title={source.text}
                    className="inline-flex items-center gap-1.5 rounded bg-white/[0.06] px-2 py-0.5 text-[10.5px] font-mono text-white/55 border border-white/[0.05] hover:border-white/10 transition-colors cursor-help"
                  >
                    {source.type === "slack" && (
                      <MessageSquare className="size-2.5 text-[#5e6ad2]" />
                    )}
                    {source.type === "gmail" && (
                      <Mail className="size-2.5 text-red-400" />
                    )}
                    {source.type === "jira" && (
                      <Sparkles className="size-2.5 text-blue-400" />
                    )}
                    {source.label}
                  </span>
                ))}
              {simStage !== "done" && (
                <span className="text-[11px] text-white/20 italic">Awaiting completion…</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Bento ─────────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-5xl px-6 py-20 border-t border-border/40">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Features
          </p>
          <h2 data-gsap-reveal className="font-display text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
            Built for agency operations
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            Zero-configuration RAG pipeline that hooks directly into your team&apos;s existing software.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                className="hover:-translate-y-0.5 transition-all duration-200"
              >
                <CardSpotlight className="group p-5 rounded-2xl border border-border bg-white dark:bg-card transition-all duration-200 h-full">
                  <div className={`mb-4 inline-flex size-10 items-center justify-center rounded-xl relative z-20 ${feature.accent}`}>
                    <Icon className={`size-5 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5 relative z-20">{feature.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed relative z-20">{feature.description}</p>
                </CardSpotlight>
              </motion.div>
            );
          })}
        </div>

        {/* Bento grid features showcase */}
        <BentoGrid className="md:auto-rows-[22rem]">
          {/* Item 1: Multi-source Integration — large (col-span-2) */}
          <BentoGridItem
            className="md:col-span-2"
            title="Multi-source Integration"
            description="Connect Slack, Gmail, Jira, and Drive. Every message, ticket, and doc flows into a single client brain automatically."
            header={
              <div className="flex flex-1 w-full h-full min-h-[8rem] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-[#5e6ad2]/[0.06] p-4">
                <IntegrationsOrbit />
              </div>
            }
            icon={<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Integrations</span>}
          />
          {/* Item 2: Neural Context Index — small (col-span-1) */}
          <BentoGridItem
            className="md:col-span-1"
            title="Neural Context Index"
            description="Signals are weighted by recency, relevance, and project importance — not raw keyword frequency."
            header={
              <div className="flex flex-1 w-full h-full min-h-[8rem] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-[#5e6ad2]/[0.06] p-4">
                <BrainHalftone />
              </div>
            }
            icon={<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Intelligence</span>}
          />
          {/* Item 3: Time-Decay Retrieval — small (col-span-1) */}
          <BentoGridItem
            className="md:col-span-1"
            title="Time-Decay Retrieval"
            description="Ask in natural language. Get answers with citations — the exact Slack message or Jira comment that supports it."
            header={
              <div className="flex flex-1 w-full h-full min-h-[8rem] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-[#5e6ad2]/[0.06] p-4">
                <RecallChart />
              </div>
            }
            icon={<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Retrieval</span>}
          />
          {/* Item 4: Live Document Sync — large (col-span-2) */}
          <BentoGridItem
            className="md:col-span-2"
            title="Live Document Sync"
            description="Proposals, SOWs, and briefs stay current. When a doc changes, the brain updates automatically — no manual uploads."
            header={
              <div className="flex flex-1 w-full h-full min-h-[8rem] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-[#5e6ad2]/[0.06] p-4">
                <ServerIsometric />
              </div>
            }
            icon={<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Docs</span>}
          />
        </BentoGrid>
      </section>

      {/* ── Neural network ASCII art section ─────────────────────────────── */}
      <section className="border-t border-border/40 bg-gradient-to-br from-muted/20 via-indigo/[0.03] to-muted/20 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">
                How it works
              </p>
              <h2 data-gsap-reveal className="font-display text-3xl font-bold tracking-tight text-foreground mb-6">
                Raw signals → unified intelligence
              </h2>
              <div className="space-y-5">
                {[
                  {
                    step: "01",
                    title: "Connect your sources",
                    body: "Authorize Slack, Gmail, Jira, and Drive in under 2 minutes. Neuron backfills the last 7 days automatically.",
                  },
                  {
                    step: "02",
                    title: "Context engine indexes everything",
                    body: "Each message, ticket, and document is chunked, embedded, and stored in a per-client pgvector namespace.",
                  },
                  {
                    step: "03",
                    title: "Ask anything, get cited answers",
                    body: "Your PM types a question in plain English. Neuron retrieves, re-ranks, and synthesizes a cited response in seconds.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <span className="font-display text-3xl font-bold text-border leading-none shrink-0 w-10 text-right">
                      {item.step}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-0.5">{item.title}</h3>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative h-72 md:h-80 flex items-center justify-center">
              {/* Ambient glow swatch */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(94,106,210,0.12),transparent_70%)] pointer-events-none" />
              <NeuralNetworkSVG />
            </div>
          </div>
        </div>
      </section>

      <Pricing />

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="border-t border-border/40 bg-foreground py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-background sm:text-4xl mb-4">
            Stop prepping. Start knowing.
          </h2>
          <p className="text-sm text-background/60 max-w-md mx-auto mb-8">
            Join agency teams who&apos;ve eliminated pre-call context gathering completely.
          </p>
          <Link
            href="/login"
            className="group inline-flex h-11 items-center gap-2 rounded-xl bg-background px-8 text-sm font-semibold text-foreground shadow-depth hover:bg-background/90 hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150"
          >
            Get started free
            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
