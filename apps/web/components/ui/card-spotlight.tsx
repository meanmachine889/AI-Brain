"use client";

import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

interface CardSpotlightProps {
  className?: string;
  children: React.ReactNode;
}

export function CardSpotlight({ className, children }: CardSpotlightProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-white transition-all duration-300",
        "hover:shadow-[0_8px_32px_rgba(94,106,210,0.12)]",
        className
      )}
    >
      {/* Radial cursor glow */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(350px circle at ${position.x}px ${position.y}px, rgba(94,106,210,0.055), transparent 60%)`,
        }}
      />
      {/* Gradient border sweep on hover — uses pseudo-border trick via background-clip */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500"
        style={{
          opacity: isHovered ? 1 : 0,
          background:
            "linear-gradient(white, white) padding-box, linear-gradient(135deg, rgba(94,106,210,0.55), rgba(165,180,252,0.35), rgba(94,106,210,0.55)) border-box",
          border: "1px solid transparent",
          borderRadius: "inherit",
        }}
      />
      {children}
    </div>
  );
}
