"use client";

import React, { useState } from "react";

type MetricName = "accuracy" | "speed" | "completeness";

interface BenchmarkData {
  neuron: number;
  standard: number;
  manual: number;
  labels: {
    neuron: string;
    standard: string;
    manual: string;
  };
}

const BENCHMARKS: Record<MetricName, BenchmarkData> = {
  accuracy: {
    neuron: 99.0,
    standard: 82.5,
    manual: 65.0,
    labels: {
      neuron: "99.0% (Zero Hallucination)",
      standard: "82.5% (High Noise)",
      manual: "65.0% (Human Error)",
    },
  },
  speed: {
    neuron: 98.2,
    standard: 45.0,
    manual: 5.0,
    labels: {
      neuron: "3 seconds (Instant Context)",
      standard: "30 seconds (Query Lag)",
      manual: "30+ minutes (Manual Dig)",
    },
  },
  completeness: {
    neuron: 96.5,
    standard: 70.0,
    manual: 40.0,
    labels: {
      neuron: "96.5% (Unified Sources)",
      standard: "70.0% (Siloed Data)",
      manual: "40.0% (Missed Updates)",
    },
  },
};

export function BenchmarkTabs() {
  const [activeTab, setActiveTab] = useState<MetricName>("accuracy");

  const currentData = BENCHMARKS[activeTab];

  return (
    <div className="w-full rounded-xl border border-white/[0.03] bg-card p-6 shadow-soft text-left">
      <div className="flex flex-wrap gap-2 border-b border-white/[0.04] pb-4 mb-6">
        <button
          onClick={() => setActiveTab("accuracy")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "accuracy"
              ? "bg-[#5e6ad2] text-white shadow-soft"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          Context Accuracy
        </button>
        <button
          onClick={() => setActiveTab("speed")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "speed"
              ? "bg-[#5e6ad2] text-white shadow-soft"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          Retrieval Speed
        </button>
        <button
          onClick={() => setActiveTab("completeness")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === "completeness"
              ? "bg-[#5e6ad2] text-white shadow-soft"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          Recall Completeness
        </button>
      </div>

      <div className="space-y-5">
        {/* Neuron */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#e4f222]" />
              Neuron (Our Engine)
            </span>
            <span className="font-mono text-[#8b95e8] font-medium">
              {currentData.labels.neuron}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/[0.03] overflow-hidden">
            <div
              style={{ width: `${currentData.neuron}%` }}
              className="h-full bg-gradient-to-r from-[#5e6ad2] to-[#8b95e8] rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(94,106,210,0.4)]"
            />
          </div>
        </div>

        {/* Standard RAG */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-white/20" />
              Standard RAG Tools
            </span>
            <span className="font-mono text-muted-foreground/60">
              {currentData.labels.standard}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/[0.03] overflow-hidden">
            <div
              style={{ width: `${currentData.standard}%` }}
              className="h-full bg-white/20 rounded-full transition-all duration-700 ease-out"
            />
          </div>
        </div>

        {/* Manual Prep */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground/60 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-white/5" />
              Manual Preparation
            </span>
            <span className="font-mono text-muted-foreground/40">
              {currentData.labels.manual}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/[0.03] overflow-hidden">
            <div
              style={{ width: `${currentData.manual}%` }}
              className="h-full bg-white/5 rounded-full transition-all duration-700 ease-out"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
