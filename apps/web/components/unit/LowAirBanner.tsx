"use client";

import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

// Scott HUD + Dräger FPS7000 escalation: drops from top when SCBA at ≤33%
// (NFPA 1981 EOSTI threshold). Stays visible until dismissed or air rises.
export default function LowAirBanner({ airPct, secondsToEmpty }: { airPct: number; secondsToEmpty: number }) {
  if (airPct > 33) return null;
  const m = Math.floor(secondsToEmpty / 60);
  const s = secondsToEmpty % 60;
  const critical = airPct < 15;

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="absolute top-0 left-0 right-0 z-40 px-3 py-2.5 flex items-center gap-2"
      style={{
        background: critical
          ? "linear-gradient(180deg, rgba(239,68,68,0.35), rgba(239,68,68,0.08))"
          : "linear-gradient(180deg, rgba(234,179,8,0.3), rgba(234,179,8,0.06))",
        borderBottom: `1.5px solid ${critical ? "#ef4444" : "#eab308"}`,
        boxShadow: `0 0 24px ${critical ? "rgba(239,68,68,0.5)" : "rgba(234,179,8,0.35)"}`,
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: critical ? 0.6 : 1.2, repeat: Infinity }}
      >
        <AlertTriangle size={18} style={{ color: critical ? "#fecaca" : "#fef3c7" }} />
      </motion.div>
      <div className="flex-1">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#fff" }}>
          {critical ? "EVACUATE NOW" : "EXIT NOW"}
        </div>
        <div className="text-[10px]" style={{ color: critical ? "#fecaca" : "#fef3c7" }}>
          Air at <span className="font-mono font-bold">{Math.round(airPct)}%</span> ·
          reserve in <span className="font-mono font-bold tabular-nums">{m}:{String(s).padStart(2, "0")}</span>
        </div>
      </div>
    </motion.div>
  );
}
