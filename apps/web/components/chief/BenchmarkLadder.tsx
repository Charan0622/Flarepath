"use client";

import { motion } from "framer-motion";
import { Check, ListChecks } from "lucide-react";
import { useChief } from "@/lib/chief-store";
import { BENCHMARKS } from "@/lib/chief-data";

export default function BenchmarkLadder() {
  const { state, toggleBenchmark } = useChief();
  const byKey = new Map(state.benchmarks.map((b) => [b.key, b]));
  const completedCount = state.benchmarks.filter((b) => b.completed_at).length;

  return (
    <div className="glass-card rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <ListChecks size={12} style={{ color: "#22c55e" }} />
          <span className="text-[11px] font-semibold text-white">ICS Benchmarks</span>
        </div>
        <span className="text-[10px] tabular-nums" style={{ color: "#71717a" }}>
          {completedCount}/{BENCHMARKS.length}
        </span>
      </div>

      <div className="relative pl-3">
        <div className="absolute left-[7px] top-1 bottom-1 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        <motion.div
          className="absolute left-[7px] top-1 w-px"
          style={{ background: "linear-gradient(180deg, #22c55e, transparent)", height: `${(completedCount / BENCHMARKS.length) * 100}%` }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />

        {BENCHMARKS.map((b) => {
          const done = byKey.get(b.key)?.completed_at;
          return (
            <button
              key={b.key}
              onClick={() => toggleBenchmark(b.key)}
              className="w-full flex items-center gap-2 py-1.5 text-left transition-colors hover:bg-white/[0.03] rounded pl-2"
            >
              <div
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 -ml-[7px]"
                style={{
                  background: done ? "#22c55e" : b.critical ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
                  border: done ? "1px solid #22c55e" : `1px solid ${b.critical ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`,
                  boxShadow: done ? "0 0 8px rgba(34,197,94,0.5)" : "none",
                }}
              >
                {done && <Check size={9} strokeWidth={3} style={{ color: "#04140c" }} />}
              </div>
              <span className={`text-[10.5px] ${done ? "line-through" : ""}`} style={{ color: done ? "#71717a" : b.critical ? "#e4e4e7" : "#a1a1aa" }}>
                {b.label}
              </span>
              {done && (
                <span className="ml-auto text-[9px] font-mono tabular-nums" style={{ color: "#52525b" }}>
                  {new Date(done).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                </span>
              )}
              {!done && b.critical && (
                <span className="ml-auto text-[8px] uppercase tracking-wider" style={{ color: "#ef4444" }}>req</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
