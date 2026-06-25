"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

export function HeroHands() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for parallax effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Springs for smooth movement
  const springConfig = { damping: 25, stiffness: 120 };
  const leftHandX = useSpring(useMotionValue(0), springConfig);
  const leftHandY = useSpring(useMotionValue(0), springConfig);
  const rightHandX = useSpring(useMotionValue(0), springConfig);
  const rightHandY = useSpring(useMotionValue(0), springConfig);
  const logoScale = useSpring(useMotionValue(1), springConfig);
  const logoGlow = useSpring(useMotionValue(0.4), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Normalize coordinates (-0.5 to 0.5)
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    mouseX.set(x);
    mouseY.set(y);

    // Left hand moves slightly right and down/up
    leftHandX.set(x * 35);
    leftHandY.set(y * 20);

    // Right hand moves slightly left and up/down (opposing direction)
    rightHandX.set(x * -35);
    rightHandY.set(y * -20);

    // Scale up logo slightly based on how close mouse is to center
    const distance = Math.sqrt(x * x + y * y);
    const closeness = Math.max(0, 1 - distance * 2);
    logoScale.set(1 + closeness * 0.15);
    logoGlow.set(0.4 + closeness * 0.6);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    leftHandX.set(0);
    leftHandY.set(0);
    rightHandX.set(0);
    rightHandY.set(0);
    logoScale.set(1);
    logoGlow.set(0.4);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[320px] md:h-[400px] bg-gradient-to-b from-[#0c0e14] via-[#080d1a] to-[#0c0e14] overflow-hidden rounded-2xl border border-border shadow-depth flex items-center justify-center cursor-pointer"
    >
      {/* Grid line overlay */}
      <div className="absolute inset-0 grid-background opacity-20 pointer-events-none" />
      
      {/* Radial blue gradient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(94,106,210,0.15)_0%,transparent_60%)] pointer-events-none" />
      
      {/* Scanline pattern layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        <defs>
          <pattern id="hero-scanlines" width="100" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="100" y2="0" stroke="#000000" strokeWidth="2" />
          </pattern>
          <linearGradient id="hand-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="1" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
          </linearGradient>
          <filter id="glow-logo" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>

      {/* SVG Canvas for Hands & Scanlines */}
      <svg
        viewBox="0 0 1000 400"
        className="absolute inset-0 w-full h-full select-none pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Left Hand Group */}
        <motion.g
          style={{ x: leftHandX, y: leftHandY }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          {/* Main Hand Path */}
          <path
            d="M -100 280 C -50 260, 50 220, 150 200 C 220 185, 270 190, 320 205 C 340 210, 360 215, 380 210 C 390 208, 410 190, 420 180 C 425 175, 410 170, 395 175 C 380 180, 365 185, 340 180 C 300 170, 270 150, 230 140 C 200 130, 160 140, 120 155 C 60 180, -20 210, -100 240 Z"
            fill="url(#hand-grad)"
            opacity="0.3"
          />
          {/* Index Finger reaching */}
          <path
            d="M 320 205 C 340 200, 370 195, 410 195 C 430 195, 450 198, 460 200 C 468 202, 470 206, 465 208 C 455 212, 430 210, 410 210 C 370 210, 340 212, 320 215 Z"
            fill="url(#hand-grad)"
            opacity="0.75"
          />
          {/* Other fingers curled */}
          <path
            d="M 330 220 C 350 225, 370 230, 385 228 C 390 227, 395 223, 390 221 C 380 218, 360 218, 340 218 Z"
            fill="url(#hand-grad)"
            opacity="0.5"
          />
          <path
            d="M 320 230 C 340 238, 360 240, 375 238 C 380 236, 382 232, 377 230 C 365 228, 345 228, 330 228 Z"
            fill="url(#hand-grad)"
            opacity="0.4"
          />
          {/* Forearm highlights */}
          <path
            d="M -100 270 C -30 240, 70 200, 180 180"
            stroke="url(#hand-grad)"
            strokeWidth="3"
            fill="none"
            opacity="0.6"
          />
          {/* Horizontal Scanline Overlay for Left Hand */}
          <path
            d="M -100 300 L 500 300 L 500 100 L -100 100 Z"
            fill="url(#hero-scanlines)"
            clipPath="url(#left-hand-clip)"
          />
        </motion.g>

        {/* Right Hand Group */}
        <motion.g
          style={{ x: rightHandX, y: rightHandY }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          {/* Main Hand Path */}
          <path
            d="M 1100 260 C 1050 245, 950 220, 850 205 C 780 195, 730 200, 680 215 C 660 220, 640 222, 620 218 C 610 216, 590 200, 580 190 C 575 185, 590 180, 605 185 C 620 190, 635 192, 660 188 C 700 180, 730 160, 770 150 C 800 140, 840 148, 880 162 C 940 185, 1020 210, 1100 230 Z"
            fill="url(#hand-grad)"
            opacity="0.3"
          />
          {/* Index Finger reaching */}
          <path
            d="M 680 215 C 660 210, 630 205, 590 205 C 570 205, 550 208, 540 210 C 532 212, 530 216, 535 218 C 545 222, 570 220, 590 220 C 630 220, 660 222, 680 225 Z"
            fill="url(#hand-grad)"
            opacity="0.75"
          />
          {/* Other fingers curled */}
          <path
            d="M 670 230 C 650 235, 630 238, 615 236 C 610 235, 605 231, 610 229 C 620 226, 640 226, 660 226 Z"
            fill="url(#hand-grad)"
            opacity="0.5"
          />
          <path
            d="M 680 242 C 660 248, 640 250, 625 248 C 620 246, 618 242, 623 240 C 635 238, 655 238, 670 238 Z"
            fill="url(#hand-grad)"
            opacity="0.4"
          />
          {/* Forearm highlights */}
          <path
            d="M 1100 250 C 1030 230, 930 200, 820 185"
            stroke="url(#hand-grad)"
            strokeWidth="3"
            fill="none"
            opacity="0.6"
          />
        </motion.g>
      </svg>

      {/* Central Pulsing Neuron Logo */}
      <motion.div
        style={{ scale: logoScale }}
        className="relative z-10 size-24 md:size-28 rounded-full bg-[#0f1018]/80 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-depth"
      >
        {/* Pulsing outer aura */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-[#5e6ad2]"
        />

        {/* Dynamic inner glow */}
        <motion.div
          style={{ opacity: logoGlow }}
          className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-500 opacity-40 blur-md"
        />

        {/* White branching Neuron Logo */}
        <svg
          viewBox="0 0 100 100"
          className="size-12 md:size-14 text-white relative z-10 filter-glow-logo"
        >
          {/* Central Stem */}
          <line x1="50" y1="20" x2="50" y2="80" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          
          {/* Left branches (forming <) */}
          <line x1="50" y1="42" x2="30" y2="22" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
          <line x1="50" y1="58" x2="30" y2="78" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
          
          {/* Right branches (forming >) */}
          <line x1="50" y1="42" x2="70" y2="22" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
          <line x1="50" y1="58" x2="70" y2="78" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />

          {/* Node dots */}
          <circle cx="50" cy="20" r="4.5" fill="currentColor" />
          <circle cx="50" cy="80" r="4.5" fill="currentColor" />
          <circle cx="30" cy="22" r="4.5" fill="currentColor" />
          <circle cx="30" cy="78" r="4.5" fill="currentColor" />
          <circle cx="70" cy="22" r="4.5" fill="currentColor" />
          <circle cx="70" cy="78" r="4.5" fill="currentColor" />
          <circle cx="50" cy="50" r="5.5" fill="currentColor" />
        </svg>
      </motion.div>
    </div>
  );
}
