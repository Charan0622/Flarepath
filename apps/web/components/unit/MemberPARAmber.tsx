"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, CheckCircle2, Mic } from "lucide-react";
import { useMember } from "@/lib/member-store";

// Full-screen PAR acknowledgement overlay. Triggered when the chief calls
// PAR. Huge thumb-zone button, 60s drain, haptic triple-pulse. Non-ack
// auto-escalates (displayed but not enforced here — chief's store reads it).
interface Props {
  parId: string | null;   // null when no PAR active
  initiatedAt: string | null;
}

export default function MemberPARAmber({ parId, initiatedAt }: Props) {
  const { state, ackPAR } = useMember();
  const [remaining, setRemaining] = useState(60);

  const acked = parId ? state.respondedParIds.includes(parId) : false;
  const active = !!parId && !!initiatedAt && !acked;

  useEffect(() => {
    if (!active || !initiatedAt) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(initiatedAt).getTime()) / 1000);
      setRemaining(Math.max(0, 60 - elapsed));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [active, initiatedAt]);

  // Haptic pulse when PAR first appears
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.vibrate) return;
    navigator.vibrate([300, 150, 300, 150, 300]);
  }, [active]);

  const urgent = remaining <= 15;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[55] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Amber full-screen wash */}
          <motion.div
            className="absolute inset-0"
            animate={{
              background: urgent
                ? ["rgba(239,68,68,0.25)", "rgba(239,68,68,0.45)", "rgba(239,68,68,0.25)"]
                : ["rgba(234,179,8,0.22)", "rgba(234,179,8,0.38)", "rgba(234,179,8,0.22)"],
            }}
            transition={{ duration: urgent ? 0.5 : 1.2, repeat: Infinity }}
            style={{ backdropFilter: "blur(6px)" }}
          />

          <div className="relative flex flex-col items-center gap-6 max-w-sm w-full">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="flex flex-col items-center"
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-3"
                style={{
                  background: urgent ? "rgba(239,68,68,0.25)" : "rgba(234,179,8,0.2)",
                  border: `2px solid ${urgent ? "#ef4444" : "#eab308"}`,
                  boxShadow: `0 0 40px ${urgent ? "rgba(239,68,68,0.6)" : "rgba(234,179,8,0.5)"}`,
                }}
              >
                <ShieldAlert size={40} style={{ color: urgent ? "#fecaca" : "#fef3c7" }} />
              </div>
              <h2 className="text-[28px] font-bold tracking-[0.22em] text-white">PAR CHECK</h2>
              <p className="text-[12px] mt-2 text-center" style={{ color: urgent ? "#fecaca" : "#fef3c7" }}>
                Command is requesting your status.<br />
                Acknowledge you are OK.
              </p>
            </motion.div>

            {/* Big ACK button with radial drain */}
            <button
              onClick={() => parId && ackPAR(parId)}
              className="relative"
              style={{ width: 220, height: 220 }}
            >
              <svg width={220} height={220} viewBox="0 0 220 220" className="absolute inset-0">
                <circle cx={110} cy={110} r={100} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
                <circle
                  cx={110} cy={110} r={100}
                  fill="none"
                  stroke={urgent ? "#ef4444" : "#eab308"}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={`${(remaining / 60) * 2 * Math.PI * 100} ${2 * Math.PI * 100}`}
                  transform="rotate(-90 110 110)"
                  style={{
                    filter: `drop-shadow(0 0 10px ${urgent ? "rgba(239,68,68,0.6)" : "rgba(234,179,8,0.5)"})`,
                    transition: "stroke-dasharray 1s linear, stroke 0.3s",
                  }}
                />
              </svg>
              <motion.div
                className="absolute inset-4 rounded-full flex flex-col items-center justify-center"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                style={{
                  background: `linear-gradient(135deg, ${urgent ? "#22c55e" : "#22c55e"}, ${urgent ? "#16a34a" : "#15803d"})`,
                  boxShadow: "0 12px 40px rgba(34,197,94,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                <CheckCircle2 size={40} strokeWidth={2.5} style={{ color: "#fff" }} />
                <span className="text-[18px] font-bold text-white mt-2 tracking-wider">I AM OK</span>
                <span className="text-[10px] text-white/80 mt-0.5 tabular-nums">{remaining}s left</span>
              </motion.div>
            </button>

            {/* Voice roll-call hint — hands-free ack when gloved */}
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            >
              <Mic size={11} style={{ color: urgent ? "#fecaca" : "#fef3c7" }} />
              <span className="text-[10px] tracking-wider" style={{ color: urgent ? "#fecaca" : "#fef3c7" }}>
                or say &ldquo;Flarepath, I am OK&rdquo;
              </span>
            </motion.div>

            <div className="text-[10px] text-center uppercase tracking-[0.18em]" style={{ color: urgent ? "#fecaca" : "#fef3c7" }}>
              Non-acknowledgement escalates to RIT
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
