"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";
import { 
  ArrowRight, 
  MessageSquare, 
  Mail, 
  Layers, 
  Sparkles, 
  CheckCircle, 
  Clock, 
  Search, 
  Lock, 
  ExternalLink,
  ChevronRight,
  RefreshCw,
  FolderDot
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const BRAND_LOGOS = [
  { name: "mosaic", icon: Layers },
  { name: "Vela", icon: Sparkles },
  { name: "Cluely", icon: Search },
  { name: "Miria", icon: CheckCircle },
  { name: "Caret", icon: Clock },
  { name: "JINSO", icon: RefreshCw },
];

const PRESETS = [
  {
    question: "What did we promise Acme by Friday?",
    answer: "Based on recent project discussions, you promised Acme Corp the **final mobile Figma mockups** and the **database schema sign-off** by Friday at 5:00 PM. John confirmed on Slack that the design files are ready, but Sarah is still waiting on client feedback for the schema.",
    sources: [
      { type: "slack", label: "Slack · 2h ago", text: "[John]: Mobile mockups are ready in Figma..." },
      { type: "gmail", label: "Gmail · Yesterday", text: "Subject: Database schema update. [Sarah]: Waiting on sign-off..." }
    ]
  },
  {
    question: "What's blocking the Vela integration?",
    answer: "The Vela integration is currently blocked by a **missing Google OAuth Client ID** in production. According to the Jira ticket **VEL-142**, developer Rahul noted that the client has not shared access to their Google Cloud console yet. A follow-up email was sent by PM Priya yesterday.",
    sources: [
      { type: "jira", label: "Jira · VEL-142", text: "Rahul: Blocked on client console access." },
      { type: "gmail", label: "Gmail · 18h ago", text: "From Priya to client: Requesting GCP credentials..." }
    ]
  },
  {
    question: "Is there any scope creep on Cluely?",
    answer: "Yes, potential scope creep detected. In Slack thread **#cluely-dev**, the client requested an **analytics dashboard module** which was not in the original project brief. A Jira comment on **CL-88** also mentions Rahul estimating this will add 12 dev-hours, but it has not been billed yet.",
    sources: [
      { type: "slack", label: "Slack · #cluely-dev", text: "Client: Can we also add a quick charts view?" },
      { type: "jira", label: "Jira · CL-88", text: "Rahul: Added subtask for charts module (12h)." }
    ]
  }
];

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [activePreset, setActivePreset] = useState(0);
  const [simText, setSimText] = useState("");
  const [simStage, setSimStage] = useState<"idle" | "typing" | "thinking" | "done">("idle");
  const [simSources, setSimSources] = useState<typeof PRESETS[0]["sources"]>([]);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    } else {
      setChecking(false);
    }
  }, [router]);

  // Simulate QA typing
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
    }, 12);

    return () => clearInterval(interval);
  }, [checking, activePreset, simStage]);

  const handleSelectPreset = (idx: number) => {
    setActivePreset(idx);
    setSimStage("thinking");
    setTimeout(() => {
      setSimStage("typing");
    }, 850);
  };

  // Run initial simulator once checking is finished
  useEffect(() => {
    if (!checking && simStage === "idle") {
      handleSelectPreset(0);
    }
  }, [checking, simStage]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#08090a] text-snow">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-2 border-[#e4f222] border-t-transparent" />
          <p className="text-xs text-muted-foreground tracking-widest uppercase font-mono">Initializing Brain</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground grid-background relative">
      {/* Matte texture overlay */}
      <div className="matte pointer-events-none absolute inset-0 opacity-4" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-obsidian text-mist font-bold text-xs ring-1 ring-white/10 shadow-depth">
              AB
            </span>
            <span className="text-sm font-semibold tracking-tight">Agency AI Brain</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-[13px] text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#demo" className="hover:text-foreground transition-colors">Interactive Demo</a>
            <a href="#integrations" className="hover:text-foreground transition-colors">Integrations</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle className="size-8 text-muted-foreground hover:text-foreground rounded-lg" />
            <Link 
              href="/login"
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link 
              href="/login"
              className="cta-lime flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium shadow-depth transition-all"
            >
              Get Started <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 text-center md:pt-24 md:pb-28">
        {/* Supporting tag */}
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm shadow-soft">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75"></span>
            <span className="relative inline-flex size-2 rounded-full bg-emerald"></span>
          </span>
          Connecting Slack, Gmail, and Jira In Real-time
        </div>

        {/* Title */}
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl md:leading-[1.1] text-foreground">
          The shared memory layer for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo to-cyan">digital agencies</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
          PMs waste 30 minutes per client gathering context before status calls. Agency AI Brain ingests client streams, building a unified brain index that answers questions in seconds.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link 
            href="/login"
            className="cta-lime flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium shadow-raised transition-all"
          >
            Start 14-day free trial <ArrowRight className="size-4" />
          </Link>
          <a 
            href="#demo"
            className="ring-hairline flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-card/30 px-5 text-sm font-medium text-foreground hover:bg-card/70 transition-all shadow-soft"
          >
            Try Interactive Demo
          </a>
        </div>

        {/* Mockup Dashboard Preview */}
        <div className="mt-16 md:mt-20 relative mx-auto max-w-4xl rounded-2xl border border-white/[0.04] bg-[#0c0d0e]/60 p-2 shadow-depth">
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-transparent to-indigo/5 blur-3xl rounded-3xl" />
          <div className="ring-hairline overflow-hidden rounded-[14px] bg-[#141618] text-left shadow-float">
            {/* Header bar */}
            <div className="flex h-11 items-center justify-between border-b border-white/[0.04] bg-[#101214] px-4">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-white/[0.06]" />
                <span className="size-3 rounded-full bg-white/[0.06]" />
                <span className="size-3 rounded-full bg-white/[0.06]" />
                <span className="ml-2 text-[11px] font-mono text-muted-foreground/50">agency-ai-brain.com/clients/acme</span>
              </div>
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-muted-foreground/60">LIVE CONTEXT</span>
            </div>

            {/* Content body layout */}
            <div className="flex h-[320px] divide-x divide-white/[0.03]">
              {/* Sidebar list mock */}
              <div className="hidden sm:flex w-44 flex-col bg-[#101214]/60 p-3">
                <div className="mb-4 h-6 w-20 rounded bg-white/5" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded bg-white/[0.04] p-1.5 ring-1 ring-white/10">
                    <span className="size-4 rounded bg-indigo/30 text-[9px] font-bold text-indigo flex items-center justify-center">A</span>
                    <div className="h-2 w-16 rounded bg-white/30" />
                  </div>
                  <div className="flex items-center gap-2 p-1.5">
                    <span className="size-4 rounded bg-white/5 text-[9px] text-muted-foreground flex items-center justify-center">V</span>
                    <div className="h-2 w-14 rounded bg-white/20" />
                  </div>
                  <div className="flex items-center gap-2 p-1.5">
                    <span className="size-4 rounded bg-white/5 text-[9px] text-muted-foreground flex items-center justify-center">C</span>
                    <div className="h-2 w-20 rounded bg-white/20" />
                  </div>
                </div>
              </div>

              {/* Chat section mock */}
              <div className="flex-1 flex flex-col bg-background/40 p-4 justify-between">
                <div className="space-y-4">
                  {/* Status header */}
                  <div className="border-b border-white/[0.04] pb-3">
                    <p className="text-[13px] font-semibold text-foreground">Acme Corp · Summary</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                      Designs are complete and awaiting sign-off. Dev team is currently integrating the authentication schema. Rahul identified a potential bottleneck with Google client IDs.
                    </p>
                  </div>
                  {/* Mock Q&A turn */}
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <div className="rounded-xl rounded-br-none bg-foreground px-3 py-1.5 text-xs text-background font-medium">
                        What did we promise Acme by Friday?
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[90%] space-y-2">
                        <div className="rounded-xl rounded-bl-none bg-card p-3 text-[12px] leading-relaxed ring-1 ring-white/10">
                          Based on discussions, you promised Acme Corp the **final mobile Figma mockups** by Friday. John confirmed they are ready.
                          <div className="mt-2 flex gap-1.5">
                            <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[9.5px] text-muted-foreground">Slack · 2h ago</span>
                            <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[9.5px] text-muted-foreground">Gmail · Yesterday</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Composer mock */}
                <div className="rounded-lg bg-card/80 p-2 border border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Ask anything about Acme...</span>
                  <span className="size-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-muted-foreground">↑</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand trust logos */}
      <section className="border-y border-border/40 bg-card/25 py-8 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">Used by high-performing agency teams</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {BRAND_LOGOS.map((logo) => {
              const Icon = logo.icon;
              return (
                <div key={logo.name} className="flex items-center gap-1.5 opacity-40 hover:opacity-75 transition-opacity">
                  <Icon className="size-4 text-foreground" />
                  <span className="text-[14px] font-bold tracking-tight lowercase">{logo.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive QA Demo Section */}
      <section id="demo" className="mx-auto max-w-5xl px-6 py-20 md:py-24">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">See client intelligence in action</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            Click one of the agency-inspired questions below to test how the RAG context engine fetches relevant facts and writes cited status updates.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPreset(idx)}
              className={`text-left p-4 rounded-xl border transition-all ${
                activePreset === idx
                  ? "bg-card border-white/15 shadow-raised ring-1 ring-white/10"
                  : "bg-card/30 border-border/60 hover:bg-card/60 hover:border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">Scenario {idx + 1}</span>
                {activePreset === idx && <span className="size-1.5 rounded-full bg-[#e4f222]" />}
              </div>
              <p className="text-[13px] font-medium text-foreground">{preset.question}</p>
            </button>
          ))}
        </div>

        {/* Demo Terminal */}
        <div className="mt-8 rounded-xl border border-white/[0.05] bg-[#0c0d0e]/95 p-5 shadow-raised min-h-[220px] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald" />
                <span className="text-[11.5px] font-mono text-muted-foreground">RAG Engine Core</span>
              </div>
              <span className="text-[10.5px] font-mono text-muted-foreground/40">Query latency: {simStage === "thinking" ? "Calculating..." : "1.2s"}</span>
            </div>

            {/* Question line */}
            <div className="flex gap-2.5 items-start">
              <span className="text-xs font-mono text-muted-foreground/60 mt-0.5">PM:</span>
              <p className="text-[13px] font-semibold text-[#8b95e8]">{PRESETS[activePreset].question}</p>
            </div>

            {/* Answer line */}
            <div className="flex gap-2.5 items-start">
              <span className="text-xs font-mono text-[#e4f222] mt-0.5">Brain:</span>
              <div className="text-[13.5px] leading-relaxed text-snow min-h-[40px] flex-1">
                {simStage === "thinking" ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground/80">
                    <span className="size-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="size-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="size-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="text-xs ml-1">Searching pgvector index & re-ranking by recency...</span>
                  </div>
                ) : (
                  <p>{simText}</p>
                )}
              </div>
            </div>
          </div>

          {/* Sources line */}
          <div className="mt-6 border-t border-white/[0.03] pt-3 flex flex-wrap gap-2 items-center">
            <span className="text-[10.5px] font-mono text-muted-foreground/50">Citations:</span>
            {simStage === "done" && simSources.map((source, j) => (
              <span
                key={j}
                title={source.text}
                className="inline-flex items-center gap-1 rounded bg-white/[0.05] px-2 py-0.5 text-[10.5px] font-mono text-[#8a8f98] border border-white/[0.03] hover:border-white/10 transition-colors cursor-help"
              >
                {source.type === "slack" && <MessageSquare className="size-2.5 text-[#5e6ad2]" />}
                {source.type === "gmail" && <Mail className="size-2.5 text-red-400" />}
                {source.type === "jira" && <Sparkles className="size-2.5 text-blue-400" />}
                {source.label}
              </span>
            ))}
            {simStage !== "done" && <span className="text-[11px] text-muted-foreground/30 italic">Awaiting completion</span>}
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section id="features" className="mx-auto max-w-5xl px-6 py-20 border-t border-border/40">
        <div className="text-center mb-14">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">Built for agency operations</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            Zero-configuration RAG pipeline that hooks directly into your team&apos;s existing software.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Card 1: Slack */}
          <div className="glass-card md:col-span-2 p-6 rounded-xl flex flex-col justify-between min-h-[200px]">
            <div>
              <div className="size-8 rounded-lg bg-[#5e6ad2]/15 text-[#5e6ad2] flex items-center justify-center mb-4">
                <MessageSquare className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Slack Channels & Threads Ingestion</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Connect channels dedicated to specific clients. Our worker fetches history, handles message threads, resolves real user names, and indexes chunks dynamically into vector storage.
              </p>
            </div>
            <div className="mt-4 flex gap-1.5">
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-[#8a8f98]">Auto-Dedupe</span>
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-[#8a8f98]">7-Day Backfill</span>
            </div>
          </div>

          {/* Card 2: Gmail */}
          <div className="glass-card p-6 rounded-xl flex flex-col justify-between min-h-[200px]">
            <div>
              <div className="size-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
                <Mail className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Signal-Matched Email Sync</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Matches client records using email domain rules and custom contact email strings. Automatically extracts plain text bodies and removes HTML clutter.
              </p>
            </div>
            <div className="mt-4">
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-[#8a8f98]">Domain Rules</span>
            </div>
          </div>

          {/* Card 3: Jira */}
          <div className="glass-card p-6 rounded-xl flex flex-col justify-between min-h-[200px]">
            <div>
              <div className="size-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <Sparkles className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Jira Ticket & Comments Track</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Imports specific project key issues. Maps issue status, due dates, assignees, and comments to allow granular question-answering about project blocks.
              </p>
            </div>
            <div className="mt-4">
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-[#8a8f98]">OAuth 3LO Flow</span>
            </div>
          </div>

          {/* Card 4: RAG Engine */}
          <div className="glass-card md:col-span-2 p-6 rounded-xl flex flex-col justify-between min-h-[200px]">
            <div>
              <div className="size-8 rounded-lg bg-[#e4f222]/10 text-[#e4f222] flex items-center justify-center mb-4">
                <Search className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Hybrid Time-Decay Retrieval</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Replaces standard semantic search. Uses `score = 0.6 * similarity + 0.4 * recency_decay` to ensure recent messages are prioritized while preserving older critical tickets. Limits sources to prevent active chats from crowding out facts.
              </p>
            </div>
            <div className="mt-4 flex gap-1.5">
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-[#8a8f98]">pgvector HNSW</span>
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-[#8a8f98]">Source-Cap Limit</span>
            </div>
          </div>

          {/* Card 5: Alerts */}
          <div className="glass-card p-6 rounded-xl flex flex-col justify-between min-h-[200px]">
            <div>
              <div className="size-8 rounded-lg bg-emerald/10 text-emerald flex items-center justify-center mb-4">
                <Clock className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Proactive Alert Engine</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Checks for silent clients (5+ days without activity), stale tickets (no update in 48 hours), and alerts PMs on impending deadlines automatically.
              </p>
            </div>
            <div className="mt-4">
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-[#8a8f98]">Daily Cron Beat</span>
            </div>
          </div>

          {/* Card 6: Google Drive */}
          <div className="glass-card md:col-span-2 p-6 rounded-xl flex flex-col justify-between min-h-[200px]">
            <div>
              <div className="size-8 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center mb-4">
                <FolderDot className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Google Drive File Ingestion <span className="ml-2 rounded-full bg-yellow-400/15 px-2 py-0.5 text-[10px] text-yellow-400">Soon</span></h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Connect folders sharing documents, PDFs, and slide decks. Automatically parses document contents using semantic chunking rules to link text structures with client records.
              </p>
            </div>
            <div className="mt-4 flex gap-1.5">
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-[#8a8f98]">LlamaIndex Parse</span>
              <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-[#8a8f98]">PDF & Docs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-20 border-t border-border/40 text-center">
        <div className="mb-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">Flat agency pricing</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
            No seat taxes. Scale your clients and developers without worrying about costs.
          </p>
        </div>

        <div className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-card p-8 shadow-raised text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 rounded-bl-lg bg-white/5 px-3 py-1 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">Flat Rate</div>
          
          <h3 className="text-sm font-semibold text-muted-foreground tracking-wider uppercase">Agency Plan</h3>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-foreground">₹12,000</span>
            <span className="text-xs text-muted-foreground">/ month</span>
          </div>
          <p className="mt-2.5 text-xs text-muted-foreground">
            Billed monthly. Cancel anytime.
          </p>

          <ul className="mt-6 space-y-3 border-t border-border/60 pt-6 text-[13px] text-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald shrink-0" />
              <span>Unlimited seats for your PMs & Devs</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald shrink-0" />
              <span>Up to 15 active client brain records</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald shrink-0" />
              <span>Slack, Gmail & Jira integrations</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald shrink-0" />
              <span>Ask Bar (RAG Q&A) & Attention Feed</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald shrink-0" />
              <span>Postgres RLS Security</span>
            </li>
          </ul>

          <div className="mt-8">
            <Link 
              href="/login"
              className="cta-lime flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium shadow-depth transition-all"
            >
              Start 14-day free trial
            </Link>
            <p className="mt-3 text-center text-[10.5px] text-muted-foreground/60">No credit card required for setup</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/10 py-10 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded bg-obsidian text-mist font-bold text-[10px] ring-1 ring-white/5">
              AB
            </span>
            <span className="text-xs font-semibold text-muted-foreground tracking-tight">Agency AI Brain</span>
          </div>

          <p className="text-[11px] text-muted-foreground/60">
            &copy; {new Date().getFullYear()} Agency AI Brain. In compliance with data isolation frameworks.
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground/75">
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
