"use client";

import React, { useRef } from "react";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { SlackIcon, JiraIcon, GmailIcon, DriveIcon } from "@/components/brand-icons";

// Extra inline SVG logos for Notion and GitHub
export function NotionIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4.6 2h14.8c1.4 0 2.6 1.2 2.6 2.6v14.8c0 1.4-1.2 2.6-2.6 2.6H4.6C3.2 22 2 20.8 2 19.4V4.6C2 3.2 3.2 2 4.6 2zm4.144 14.858V8.125l.07-.058L12.3 8.04l.117.086 2.871 4.58 2.054-4.508h3.33v9.66h-3.05v-5.26l-.083.056-2.918 4.636-2.022.058-2.883-4.636-.083-.056v5.26H8.744z" />
    </svg>
  );
}

export function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

export function IntegrationsOrbit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const slackRef = useRef<HTMLDivElement>(null);
  const gmailRef = useRef<HTMLDivElement>(null);
  const notionRef = useRef<HTMLDivElement>(null);
  const jiraRef = useRef<HTMLDivElement>(null);
  const driveRef = useRef<HTMLDivElement>(null);
  const githubRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative flex h-[350px] w-full items-center justify-between overflow-hidden rounded-xl border border-border bg-card p-10 shadow-depth"
    >
      <div className="absolute inset-0 grid-background opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(94,106,210,0.06)_0%,transparent_60%)] pointer-events-none" />

      {/* Left Column connectors */}
      <div className="flex flex-col justify-between h-full z-10 w-16">
        {/* Slack */}
        <div
          ref={slackRef}
          title="Slack Ingestion"
          className="group relative flex size-12 cursor-pointer items-center justify-center rounded-xl border border-border bg-background shadow-soft transition-all duration-300 hover:border-[#36c5f0]/50 hover:bg-[#36c5f0]/5"
        >
          <SlackIcon className="size-6 select-none" />
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-popover border border-border px-2 py-0.5 text-[9px] font-mono text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-soft">
            Slack Sync
          </div>
        </div>

        {/* Gmail */}
        <div
          ref={gmailRef}
          title="Gmail Sync"
          className="group relative flex size-12 cursor-pointer items-center justify-center rounded-xl border border-border bg-background shadow-soft transition-all duration-300 hover:border-red-500/50 hover:bg-red-500/5"
        >
          <GmailIcon className="size-6 select-none" />
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-popover border border-border px-2 py-0.5 text-[9px] font-mono text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-soft">
            Gmail Filter
          </div>
        </div>

        {/* Notion */}
        <div
          ref={notionRef}
          title="Notion Integration"
          className="group relative flex size-12 cursor-pointer items-center justify-center rounded-xl border border-border bg-background shadow-soft transition-all duration-300 hover:border-foreground/30 hover:bg-muted"
        >
          <NotionIcon className="size-6 text-foreground select-none" />
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-popover border border-border px-2 py-0.5 text-[9px] font-mono text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-soft">
            Notion Wiki
          </div>
        </div>
      </div>

      {/* Center Neuron core */}
      <div className="z-10 flex flex-col items-center justify-center">
        <div
          ref={centerRef}
          className="relative flex size-20 items-center justify-center rounded-full border border-border/80 bg-gradient-to-b from-[#16181c] to-[#08090a] shadow-float"
        >
          {/* Internal core glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/10 via-indigo-500/20 to-pink-500/10 blur-sm" />
          
          <svg viewBox="0 0 100 100" className="size-9 text-white relative z-10">
            <line x1="50" y1="20" x2="50" y2="80" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" />
            <line x1="50" y1="42" x2="30" y2="22" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            <line x1="50" y1="58" x2="30" y2="78" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            <line x1="50" y1="42" x2="70" y2="22" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            <line x1="50" y1="58" x2="70" y2="78" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            <circle cx="50" cy="20" r="5" fill="currentColor" />
            <circle cx="50" cy="80" r="5" fill="currentColor" />
            <circle cx="30" cy="22" r="5" fill="currentColor" />
            <circle cx="30" cy="78" r="5" fill="currentColor" />
            <circle cx="70" cy="22" r="5" fill="currentColor" />
            <circle cx="70" cy="78" r="5" fill="currentColor" />
            <circle cx="50" cy="50" r="6" fill="currentColor" />
          </svg>
        </div>
        <span className="mt-2.5 text-[10px] font-mono tracking-widest text-[#8b95e8] uppercase">Neuron Core</span>
      </div>

      {/* Right Column connectors */}
      <div className="flex flex-col justify-between h-full z-10 w-16 items-end">
        {/* Jira */}
        <div
          ref={jiraRef}
          title="Jira Sync"
          className="group relative flex size-12 cursor-pointer items-center justify-center rounded-xl border border-border bg-background shadow-soft transition-all duration-300 hover:border-blue-500/50 hover:bg-blue-500/5"
        >
          <JiraIcon className="size-6 select-none" />
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-popover border border-border px-2 py-0.5 text-[9px] font-mono text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-soft">
            Jira Tickets
          </div>
        </div>

        {/* Google Drive */}
        <div
          ref={driveRef}
          title="Google Drive Sync"
          className="group relative flex size-12 cursor-pointer items-center justify-center rounded-xl border border-border bg-background shadow-soft transition-all duration-300 hover:border-emerald/50 hover:bg-emerald/5"
        >
          <DriveIcon className="size-6 select-none" />
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-popover border border-border px-2 py-0.5 text-[9px] font-mono text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-soft">
            Drive Files
          </div>
        </div>

        {/* GitHub */}
        <div
          ref={githubRef}
          title="GitHub Integration"
          className="group relative flex size-12 cursor-pointer items-center justify-center rounded-xl border border-border bg-background shadow-soft transition-all duration-300 hover:border-indigo-400/50 hover:bg-[#5e6ad2]/5"
        >
          <GitHubIcon className="size-6 text-foreground select-none" />
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-popover border border-border px-2 py-0.5 text-[9px] font-mono text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-soft">
            Git Commits
          </div>
        </div>
      </div>

      {/* Animated beams connecting all nodes to center */}
      {/* Left side beams (flowing in) */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={slackRef}
        toRef={centerRef}
        gradientStartColor="#36c5f0"
        gradientStopColor="#5e6ad2"
        duration={3}
        curvature={-25}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={gmailRef}
        toRef={centerRef}
        gradientStartColor="#fc413d"
        gradientStopColor="#5e6ad2"
        duration={2.5}
        curvature={0}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={notionRef}
        toRef={centerRef}
        gradientStartColor="#ffffff"
        gradientStopColor="#5e6ad2"
        duration={3.5}
        curvature={25}
      />

      {/* Right side beams (flowing in) */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={jiraRef}
        toRef={centerRef}
        gradientStartColor="#0052cc"
        gradientStopColor="#5e6ad2"
        duration={3.2}
        curvature={-25}
        reverse
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={driveRef}
        toRef={centerRef}
        gradientStartColor="#0ebc5f"
        gradientStopColor="#5e6ad2"
        duration={2.8}
        curvature={0}
        reverse
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={githubRef}
        toRef={centerRef}
        gradientStartColor="#5e6ad2"
        gradientStopColor="#8b95e8"
        duration={3.6}
        curvature={25}
        reverse
      />
    </div>
  );
}
