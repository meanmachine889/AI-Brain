"use client";

import React from "react";
import { motion } from "motion/react";

export function BrainHalftone() {
  // Define synapses (firing nodes) with coordinates and animation delays
  const synapses = [
    { x: 140, y: 110, delay: 0 },
    { x: 170, y: 80, delay: 0.8 },
    { x: 210, y: 90, delay: 1.5 },
    { x: 250, y: 110, delay: 0.3 },
    { x: 280, y: 140, delay: 2.1 },
    { x: 270, y: 180, delay: 1.1 },
    { x: 240, y: 220, delay: 0.6 },
    { x: 190, y: 240, delay: 1.9 },
    { x: 150, y: 210, delay: 0.4 },
    { x: 120, y: 160, delay: 1.2 },
    { x: 180, y: 150, delay: 0.7 },
    { x: 220, y: 160, delay: 1.4 },
  ];

  return (
    <div className="relative flex h-[260px] w-full items-center justify-center overflow-hidden rounded-xl border border-white/[0.03] bg-card p-6 shadow-soft">
      <div className="absolute inset-0 grid-background opacity-20 pointer-events-none" />
      
      {/* SVG Canvas */}
      <svg
        viewBox="0 0 400 300"
        className="w-full h-full text-foreground select-none max-w-[340px]"
      >
        <defs>
          {/* Halftone dot pattern */}
          <pattern
            id="brain-halftone-dots"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="6" cy="6" r="3.2" fill="currentColor" className="text-[#8a8f98]/40" />
            <circle cx="6" cy="6" r="1.5" fill="currentColor" className="text-white/30" />
          </pattern>

          {/* Glowing filter */}
          <filter id="glow-synapse" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Linear gradient mask */}
          <linearGradient id="brain-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5e6ad2" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#8b95e8" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Brain Silhouette Masked by Halftone */}
        <g>
          {/* Main outer glow shadow */}
          <path
            d="M 200 40 
               C 130 40, 80 80, 80 150 
               C 80 200, 110 220, 140 230 
               C 150 250, 180 260, 200 260 
               C 220 260, 250 250, 260 230 
               C 290 220, 320 200, 320 150 
               C 320 80, 270 40, 200 40 Z"
            fill="url(#brain-grad)"
            className="blur-md opacity-25"
          />

          {/* Anatomical brain contours shape */}
          <path
            d="M 200 45 
               C 170 45, 140 55, 120 75
               C 100 95, 90 120, 90 150
               C 90 170, 95 190, 110 205
               C 115 210, 120 215, 125 218
               C 135 224, 142 226, 145 235
               C 150 245, 170 255, 200 255
               C 230 255, 250 245, 255 235
               C 258 226, 265 224, 275 218
               C 280 215, 285 210, 290 205
               C 305 190, 310 170, 310 150
               C 310 120, 300 95, 280 75
               C 260 55, 230 45, 200 45 Z"
            fill="url(#brain-halftone-dots)"
          />

          {/* Dynamic brain lines/wrinkles representing channels */}
          <path
            d="M 200 45 L 200 255"
            stroke="#1d1f23"
            strokeWidth="3.5"
            strokeDasharray="4 4"
            opacity="0.5"
          />
          
          <path
            d="M 120 75 C 150 100, 170 120, 200 130 C 230 120, 250 100, 280 75"
            stroke="#1d1f23"
            strokeWidth="3"
            fill="none"
            opacity="0.3"
          />

          <path
            d="M 95 130 C 130 140, 170 145, 200 150 C 230 145, 270 140, 305 130"
            stroke="#1d1f23"
            strokeWidth="3"
            fill="none"
            opacity="0.3"
          />

          <path
            d="M 110 205 C 140 180, 170 170, 200 170 C 230 170, 260 180, 290 205"
            stroke="#1d1f23"
            strokeWidth="3"
            fill="none"
            opacity="0.3"
          />
        </g>

        {/* Interactive pulsing synapses */}
        {synapses.map((syn, index) => (
          <g key={index}>
            {/* Soft background aura */}
            <motion.circle
              cx={syn.x}
              cy={syn.y}
              r="7"
              fill="#5e6ad2"
              filter="url(#glow-synapse)"
              initial={{ opacity: 0.1, scale: 0.8 }}
              animate={{
                opacity: [0.1, 0.45, 0.1],
                scale: [0.8, 1.4, 0.8],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                delay: syn.delay,
                ease: "easeInOut",
              }}
            />
            {/* Sharp core */}
            <motion.circle
              cx={syn.x}
              cy={syn.y}
              r="2.5"
              fill="#e4f222"
              initial={{ scale: 0.7 }}
              animate={{
                scale: [0.7, 1.25, 0.7],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                delay: syn.delay,
                ease: "easeInOut",
              }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
