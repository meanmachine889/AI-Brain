"use client";

import React from "react";
import { motion } from "motion/react";

interface ColumnProps {
  x: number;
  y: number;
  w: number;
  h: number;
  height: number;
  colorLeft: string;
  colorRight: string;
  colorTop: string;
  delay: number;
  label: string;
  time: string;
}

function IsometricColumn({
  x,
  y,
  w,
  h,
  height,
  colorLeft,
  colorRight,
  colorTop,
  delay,
  label,
  time,
}: ColumnProps) {
  // Height animation variants
  const columnVariants = {
    hidden: { scaleY: 0 },
    visible: {
      scaleY: 1,
      transition: {
        duration: 1.2,
        delay: delay,
        ease: [0.16, 1, 0.3, 1] as any, // easeOutExpo
      },
    },
  };

  return (
    <motion.g
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="origin-bottom"
      style={{ transformOrigin: `${x}px ${y}px` }}
      variants={columnVariants}
    >
      {/* Front-Left Face */}
      <polygon
        points={`${x - w},${y - h} ${x},${y} ${x},${y - height} ${x - w},${y - h - height}`}
        fill={colorLeft}
      />
      {/* Front-Right Face */}
      <polygon
        points={`${x},${y} ${x + w},${y - h} ${x + w},${y - h - height} ${x},${y - height}`}
        fill={colorRight}
      />
      {/* Top Cap Face */}
      <polygon
        points={`${x - w},${y - h - height} ${x},${y - height} ${x + w},${y - h - height} ${x},${y - 2 * h - height}`}
        fill={colorTop}
      />

      {/* Floating labels on top of the column */}
      <foreignObject
        x={x - w - 20}
        y={y - height - 2 * h - 45}
        width={w * 2 + 40}
        height="40"
        className="overflow-visible pointer-events-none select-none text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: delay + 0.5, duration: 0.5 }}
          className="flex flex-col items-center justify-center"
        >
          <span className="text-[11px] font-mono font-bold tracking-tight text-white bg-[#08090a]/90 px-1.5 py-0.5 rounded border border-white/10 shadow-soft">
            {time}
          </span>
          <span className="text-[9px] font-medium text-muted-foreground mt-0.5 uppercase tracking-wider">
            {label}
          </span>
        </motion.div>
      </foreignObject>
    </motion.g>
  );
}

export function RecallChart() {
  return (
    <div className="relative flex h-[260px] w-full items-center justify-center overflow-hidden rounded-xl border border-white/[0.03] bg-card p-6 shadow-soft">
      <div className="absolute inset-0 grid-background opacity-20 pointer-events-none" />

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 400 280"
        className="w-full h-full select-none max-w-[340px]"
      >
        {/* Base Grid Plane (Isometric) */}
        <polygon
          points="200,200 80,140 200,80 320,140"
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="2"
        />
        <line x1="80" y1="140" x2="320" y2="140" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
        <line x1="200" y1="80" x2="200" y2="200" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />

        {/* Column 1: Manual Prep */}
        <IsometricColumn
          x={100}
          y={210}
          w={22}
          h={11}
          height={35}
          colorLeft="#1a1c1e"
          colorRight="#24272a"
          colorTop="#32363b"
          delay={0.4}
          label="Manual"
          time="30m+"
        />

        {/* Column 2: Other RAG Tools */}
        <IsometricColumn
          x={200}
          y={210}
          w={22}
          h={11}
          height={75}
          colorLeft="#2b2045"
          colorRight="#392a5c"
          colorTop="#523d85"
          delay={0.2}
          label="Other RAG"
          time="30s"
        />

        {/* Column 3: Neuron */}
        <IsometricColumn
          x={300}
          y={210}
          w={22}
          h={11}
          height={145}
          colorLeft="#3b42a8"
          colorRight="#5e6ad2"
          colorTop="#8b95e8"
          delay={0}
          label="Neuron"
          time="3s"
        />

        {/* Connection/Indicator for Neuron column */}
        <motion.g
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.8 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
        >
          {/* Central Pulsing Glow under Neuron */}
          <circle cx="300" cy="210" r="15" fill="none" stroke="#e4f222" strokeWidth="1.5" strokeDasharray="3 3" />
        </motion.g>
      </svg>
    </div>
  );
}
