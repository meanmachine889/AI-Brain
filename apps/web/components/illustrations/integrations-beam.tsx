"use client";

import React, { forwardRef, useRef } from "react";
import { User } from "lucide-react";

import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { SlackIcon, JiraIcon, GmailIcon, DriveIcon } from "@/components/brand-icons";

// Round node that anchors a beam endpoint.
const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode; title?: string }
>(({ className, children, title }, ref) => {
  return (
    <div
      ref={ref}
      title={title}
      className={cn(
        "z-10 flex size-12 items-center justify-center rounded-full border border-border bg-white p-3 shadow-[0_0_20px_-12px_rgba(8,9,10,0.5)]",
        className,
      )}
    >
      {children}
    </div>
  );
});
Circle.displayName = "Circle";

// The Neuron logomark — the center node.
function NeuronCore() {
  return (
    <svg viewBox="0 0 28 28" fill="none" className="size-8 text-indigo" aria-hidden>
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

// Slack / Gmail / Jira / Drive → Neuron core → you.
export function IntegrationsBeam({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slackRef = useRef<HTMLDivElement>(null);
  const gmailRef = useRef<HTMLDivElement>(null);
  const jiraRef = useRef<HTMLDivElement>(null);
  const driveRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-[22rem] w-full items-center justify-center overflow-hidden rounded-2xl border border-border p-8",
        className,
      )}
    >
      {/* image background */}
      <img
        src="/feature%20assets/image.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute rotate-180 inset-0 size-full select-none object-cover"
      />

      <div className="flex size-full max-w-md flex-row items-stretch justify-between gap-10">
        {/* Sources */}
        <div className="flex flex-col justify-center gap-3">
          <Circle ref={slackRef} title="Slack">
            <SlackIcon className="size-6" />
          </Circle>
          <Circle ref={gmailRef} title="Gmail">
            <GmailIcon className="size-6" />
          </Circle>
          <Circle ref={jiraRef} title="Jira">
            <JiraIcon className="size-6" />
          </Circle>
          <Circle ref={driveRef} title="Google Drive">
            <DriveIcon className="size-6" />
          </Circle>
        </div>

        {/* Neuron core */}
        <div className="flex flex-col justify-center">
          <Circle ref={coreRef} className="size-16 border-indigo/30" title="Neuron">
            <NeuronCore />
          </Circle>
        </div>

        {/* The PM */}
        <div className="flex flex-col justify-center">
          <Circle ref={userRef} title="You">
            <User className="size-6 text-foreground" />
          </Circle>
        </div>
      </div>

      {/* Sources flow into the core */}
      <AnimatedBeam containerRef={containerRef} fromRef={slackRef} toRef={coreRef} curvature={-30} duration={3} gradientStartColor="#36c5f0" gradientStopColor="#5e6ad2" />
      <AnimatedBeam containerRef={containerRef} fromRef={gmailRef} toRef={coreRef} curvature={-10} duration={2.6} gradientStartColor="#fc413d" gradientStopColor="#5e6ad2" />
      <AnimatedBeam containerRef={containerRef} fromRef={jiraRef} toRef={coreRef} curvature={10} duration={3.2} gradientStartColor="#0052cc" gradientStopColor="#5e6ad2" />
      <AnimatedBeam containerRef={containerRef} fromRef={driveRef} toRef={coreRef} curvature={30} duration={2.8} gradientStartColor="#0ebc5f" gradientStopColor="#5e6ad2" />
      {/* Core delivers context to the PM */}
      <AnimatedBeam containerRef={containerRef} fromRef={coreRef} toRef={userRef} duration={3} gradientStartColor="#5e6ad2" gradientStopColor="#8b95e8" />
    </div>
  );
}
