"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, AlertTriangle, Activity } from "lucide-react";
import { useMember, type MemberStatus } from "@/lib/member-store";

interface Props {
  onMayday: () => void;
}

const STATUS_META: Record<MemberStatus, { label: string; color: string; emoji: string }> = {
  en_route:   { label: "En Route",   color: "#eab308", emoji: "🚒" },
  on_scene:   { label: "On Scene",   color: "#ef4444", emoji: "🔥" },
  returning:  { label: "Returning",  color: "#3b82f6", emoji: "↩︎" },
  available:  { label: "Available",  color: "#22c55e", emoji: "✓" },
};

// Bottom-pinned thumb-zone dock: PTT center, status left, MAYDAY right.
// Triple-press MAYDAY to open (defeats glove misfires).
export default function ActionDock({ onMayday }: Props) {
  const { state, setStatus } = useMember();
  const [pttActive, setPttActive] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const maydayTaps = useRef<number[]>([]);

  // Clean up taps older than 800ms
  function onMaydayPress() {
    const now = Date.now();
    maydayTaps.current = [...maydayTaps.current.filter((t) => now - t < 800), now];
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
    if (maydayTaps.current.length >= 3) {
      maydayTaps.current = [];
      onMayday();
    }
  }

  const current = STATUS_META[state.status];

  return (
    <>
      <div
        className="absolute left-0 right-0 bottom-0 z-30 flex items-center justify-between gap-3 px-4 pb-4 pt-3"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(8,8,14,0.8) 35%)",
        }}
      >
        {/* Status */}
        <button
          onClick={() => setStatusOpen((o) => !o)}
          className="relative flex flex-col items-center justify-center gap-0.5 rounded-2xl"
          style={{
            minWidth: 72, height: 72,
            background: `linear-gradient(135deg, ${current.color}30, ${current.color}0d)`,
            border: `1.5px solid ${current.color}60`,
            boxShadow: `0 4px 16px ${current.color}2e, inset 0 1px 0 rgba(255,255,255,0.08)`,
            color: current.color,
          }}
        >
          <Activity size={18} />
          <span className="text-[9px] font-bold uppercase tracking-wider leading-tight text-center px-1">{current.label}</span>
        </button>

        {/* PTT */}
        <motion.button
          onPointerDown={() => { setPttActive(true); if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20); }}
          onPointerUp={() => setPttActive(false)}
          onPointerLeave={() => setPttActive(false)}
          whileTap={{ scale: 0.97 }}
          className="relative flex flex-col items-center justify-center rounded-full flex-1 shrink-0"
          style={{
            maxWidth: 120, height: 96,
            background: pttActive
              ? "radial-gradient(circle, #3b82f6 0%, #1d4ed8 100%)"
              : "radial-gradient(circle, rgba(59,130,246,0.35), rgba(59,130,246,0.06))",
            border: `2px solid ${pttActive ? "#60a5fa" : "rgba(59,130,246,0.55)"}`,
            boxShadow: pttActive
              ? "0 0 40px rgba(59,130,246,0.65), inset 0 1px 0 rgba(255,255,255,0.2)"
              : "0 6px 20px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
            color: "#fff",
          }}
        >
          {pttActive && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              animate={{ scale: [1, 1.15], opacity: [0.6, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{ border: "2px solid #60a5fa" }}
            />
          )}
          <Mic size={26} strokeWidth={2.5} />
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] mt-1">
            {pttActive ? "LIVE" : "HOLD · PTT"}
          </span>
        </motion.button>

        {/* MAYDAY */}
        <button
          onClick={onMaydayPress}
          className="relative flex flex-col items-center justify-center gap-0.5 rounded-2xl"
          style={{
            minWidth: 72, height: 72,
            background: "linear-gradient(135deg, rgba(239,68,68,0.3), rgba(239,68,68,0.08))",
            border: "1.5px solid rgba(239,68,68,0.6)",
            boxShadow: "0 4px 16px rgba(239,68,68,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
            color: "#ef4444",
          }}
        >
          <AlertTriangle size={18} />
          <span className="text-[9px] font-bold uppercase tracking-wider">MAYDAY</span>
          <span className="text-[8px] opacity-70">3x tap</span>
        </button>
      </div>

      {/* Status pop-up */}
      {statusOpen && (
        <div
          className="fixed inset-0 z-[40]"
          onClick={() => setStatusOpen(false)}
        >
          <div
            className="absolute left-4 right-4 bottom-[96px] glass-strong rounded-2xl p-3 grid grid-cols-2 gap-2"
            style={{ boxShadow: "0 -12px 32px rgba(0,0,0,0.5)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {(Object.keys(STATUS_META) as MemberStatus[]).map((s) => {
              const meta = STATUS_META[s];
              const active = state.status === s;
              return (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setStatusOpen(false); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left"
                  style={{
                    background: active ? `${meta.color}24` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${active ? `${meta.color}60` : "rgba(255,255,255,0.06)"}`,
                    color: active ? meta.color : "#e4e4e7",
                    minHeight: 56,
                  }}
                >
                  <span className="text-[16px]">{meta.emoji}</span>
                  <span className="text-[12px] font-bold uppercase tracking-wider">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
