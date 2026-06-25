"use client";

import React, { useState } from "react";
import { motion } from "motion/react";

export function ServerIsometric() {
  const [isHovered, setIsHovered] = useState(false);

  // Isometric drawer translation coordinates
  // Drawer slides out along the bottom-left isometric axis (-30 degrees / 210 degrees)
  const drawerVariants = {
    closed: { x: 0, y: 0 },
    open: { 
      x: -36, 
      y: 21,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as any, // easeOutExpo
      }
    },
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex h-[260px] w-full items-center justify-center overflow-hidden rounded-xl border border-white/[0.03] bg-card p-6 shadow-soft cursor-pointer"
    >
      <div className="absolute inset-0 grid-background opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(94,106,210,0.05)_0%,transparent_60%)] pointer-events-none" />

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 400 300"
        className="w-full h-full select-none max-w-[340px]"
      >
        {/* Shadow base on floor */}
        <polygon
          points="200,240 100,190 200,140 300,190"
          fill="black"
          opacity="0.25"
          className="blur-md"
        />

        {/* Server Cabinet Base / Plinth */}
        <g>
          {/* Top of base */}
          <polygon points="200,225 125,187.5 200,150 275,187.5" fill="#131517" stroke="#23252a" strokeWidth="1" />
          {/* Left of base */}
          <polygon points="125,187.5 200,225 200,240 125,202.5" fill="#0c0d0e" stroke="#23252a" strokeWidth="1" />
          {/* Right of base */}
          <polygon points="200,225 275,187.5 275,202.5 200,240" fill="#1a1c1e" stroke="#23252a" strokeWidth="1" />
        </g>

        {/* Main Cabinet */}
        <g>
          {/* Cabinet Top Face */}
          <polygon points="200,90 125,127.5 200,165 275,127.5" fill="#f7f8f8" stroke="#d0d6e0" strokeWidth="1" />
          
          {/* Cabinet Left Face (White panel with cutout for drawer) */}
          <polygon points="125,127.5 200,165 200,225 125,187.5" fill="#e5e5e6" stroke="#d0d6e0" strokeWidth="1" />
          
          {/* Cabinet Right Face (Instrument panel) */}
          <polygon points="200,165 275,127.5 275,187.5 200,225" fill="#161718" stroke="#23252a" strokeWidth="1" />

          {/* Right Face detailing: ventilation slots & screen */}
          {/* Blue status screen */}
          <polygon points="215,152.5 260,130 260,145 215,167.5" fill="#5e6ad2" opacity="0.85" />
          <polygon points="220,152.5 255,135 255,138 220,155.5" fill="#e4f222" opacity="0.9" /> {/* neon screen line */}

          {/* Vent lines */}
          <polygon points="210,180 265,152.5 265,155 210,182.5" fill="#23252a" />
          <polygon points="210,187.5 265,160 265,162.5 210,190" fill="#23252a" />
          <polygon points="210,195 265,167.5 265,170 210,197.5" fill="#23252a" />

          {/* Glowing LEDs */}
          <circle cx="215" cy="210" r="2.5" fill="#27a644" opacity="0.8" />
          <circle cx="225" cy="205" r="2.5" fill="#02b8cc" opacity="0.8" />
          <circle cx="235" cy="200" r="2.5" fill="#e4f222" opacity="0.8" />
          <circle cx="245" cy="195" r="2.5" fill="#eb5757" opacity="0.8" />
        </g>

        {/* --- Drawer Compartment --- */}
        {/* Inset shadow back of drawer slot */}
        <polygon points="140,140 180,160 180,200 140,180" fill="#08090a" />

        {/* Sliding Drawer Group */}
        <motion.g
          animate={isHovered ? "open" : "closed"}
          variants={drawerVariants}
        >
          {/* Hanging File Folders (rendered inside the drawer depth) */}
          {/* Red Folder */}
          <polygon points="142,130 148,133 148,160 142,157" fill="#eb5757" />
          <polygon points="148,133 154,136 154,163 148,160" fill="#c93b3b" />
          <polygon points="142,130 148,133 152,131 146,128" fill="#f87171" />

          {/* Yellow Folder */}
          <polygon points="152,135 158,138 158,165 152,162" fill="#ffe921" />
          <polygon points="158,138 164,141 164,168 158,165" fill="#dca000" />
          <polygon points="152,135 158,138 162,136 156,133" fill="#fff566" />

          {/* Green Folder */}
          <polygon points="162,140 168,143 168,170 162,167" fill="#27a644" />
          <polygon points="168,143 174,146 174,173 168,170" fill="#1e7f34" />
          <polygon points="162,140 168,143 172,141 166,138" fill="#52c41a" />

          {/* Blue Folder */}
          <polygon points="172,145 178,148 178,175 172,172" fill="#5e6ad2" />
          <polygon points="178,148 184,151 184,178 178,175" fill="#3b42a8" />
          <polygon points="172,145 178,148 182,146 176,143" fill="#8b95e8" />

          {/* Drawer Chassis Frame */}
          {/* Drawer back depth */}
          <polygon points="135,137.5 140,140 140,200 135,197.5" fill="#62666d" />
          <polygon points="140,200 180,220 180,218 140,198" fill="#383b3f" />

          {/* Drawer Front Face (White panel + blue handle) */}
          <polygon points="135,137.5 175,157.5 175,217.5 135,197.5" fill="#f7f8f8" stroke="#d0d6e0" strokeWidth="1" />
          {/* Drawer Handle */}
          <polygon points="150,175 160,180 160,185 150,180" fill="#5e6ad2" />
        </motion.g>

        {/* Visual Cue overlay */}
        <foreignObject
          x="120"
          y="235"
          width="160"
          height="40"
          className="overflow-visible pointer-events-none select-none text-center"
        >
          <div className="text-[10px] font-mono text-muted-foreground/60">
            {isHovered ? "INGESTING CHUNKS..." : "HOVER TO EXTRACT"}
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}
