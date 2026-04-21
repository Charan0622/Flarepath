"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Star, Users } from "lucide-react";
import type { CrewMember } from "@/lib/crew-data";
import { synthesizeBiometric } from "@/lib/chief-data";

// True orbital mini-constellation: member at center, teammates orbiting by
// proximity. Live biometric halo on each. Tap to set buddy.
interface Props {
  captain: CrewMember | null;
  members: CrewMember[];
  memberBadge: string | null;
  buddyBadge: string | null;
  onSelectBuddy: (badge: string) => void;
}

const STATUS_COLOR: Record<string, string> = {
  nominal: "#22c55e",
  elevated: "#eab308",
  warning: "#f97316",
  critical: "#ef4444",
};

export default function CrewMiniConstellation({
  captain, members, memberBadge, buddyBadge, onSelectBuddy,
}: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, []);

  // All crew except self
  const orbit = useMemo(() => {
    return [
      captain ? { ...captain, isCaptain: true } : null,
      ...members.map((m) => ({ ...m, isCaptain: false })),
    ].filter(Boolean).filter((m) => (m as CrewMember).badge !== memberBadge) as ({ isCaptain: boolean } & CrewMember)[];
  }, [captain, members, memberBadge]);

  return (
    <div className="mx-3">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Users size={11} style={{ color: "#eab308" }} />
        <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#a1a1aa" }}>Your Squad</span>
        <span className="ml-auto text-[9px]" style={{ color: "#71717a" }}>tap to buddy-up</span>
      </div>

      <div
        className="relative w-full glass-card rounded-2xl"
        style={{ height: 200 }}
      >
        {/* Background rings */}
        <svg className="absolute inset-0 pointer-events-none" viewBox="-120 -100 240 200" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
          <circle cx={0} cy={0} r={70} fill="none" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />
          <circle cx={0} cy={0} r={40} fill="none" stroke="rgba(255,255,255,0.04)" strokeDasharray="1 3" />
        </svg>

        {/* Center: YOU */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{ transform: "translate(-50%, -50%)" }}
        >
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(59,130,246,0.1))",
              border: "2px solid #60a5fa",
              boxShadow: "0 0 20px rgba(59,130,246,0.6)",
              color: "#bfdbfe",
              fontSize: 11, fontWeight: 800,
            }}
          >
            YOU
          </motion.div>
        </div>

        {/* Orbiting members */}
        {orbit.map((m, i) => {
          const count = orbit.length || 1;
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
          const radius = 70;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          const activity = m.isCaptain ? "interior" : "staged";
          const bio = synthesizeBiometric(m.badge, activity);
          const statusColor = STATUS_COLOR[bio.status];
          const airPct = Math.max(0, Math.min(100, (bio.air_psi / 4500) * 100));
          const hrPeriod = Math.max(400, 60_000 / bio.heart_rate);
          const isBuddy = m.badge === buddyBadge;

          return (
            <motion.button
              key={m.badge}
              onClick={() => onSelectBuddy(m.badge)}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1, x, y }}
              transition={{ type: "spring", stiffness: 140, damping: 22, delay: i * 0.05 }}
              className="absolute left-1/2 top-1/2 flex items-center justify-center"
              style={{ width: 40, height: 40, marginLeft: -20, marginTop: -20 }}
              title={m.name}
            >
              {/* Air ring */}
              <svg className="absolute pointer-events-none" width={44} height={44} viewBox="0 0 44 44" style={{ inset: -2 }}>
                <circle cx={22} cy={22} r={20} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2} />
                <circle
                  cx={22} cy={22} r={20}
                  fill="none"
                  stroke={airPct > 66 ? "#22c55e" : airPct > 33 ? "#eab308" : "#ef4444"}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray={`${(airPct / 100) * 2 * Math.PI * 20} ${2 * Math.PI * 20}`}
                  transform="rotate(-90 22 22)"
                />
              </svg>

              {/* HR halo */}
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: 0,
                  border: `1.5px solid ${statusColor}`,
                  boxShadow: `0 0 8px ${statusColor}80`,
                }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: hrPeriod / 1000, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Buddy indicator */}
              {isBuddy && (
                <div
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-bold px-1 rounded"
                  style={{ background: "#22c55e", color: "#04140c", letterSpacing: "0.1em" }}
                >
                  BUDDY
                </div>
              )}

              {/* Avatar body */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center relative"
                style={{
                  background: m.isCaptain
                    ? "linear-gradient(135deg, rgba(234,179,8,0.35), rgba(234,179,8,0.1))"
                    : "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                  border: `1.5px solid ${m.isCaptain ? "rgba(234,179,8,0.55)" : "rgba(255,255,255,0.14)"}`,
                  color: m.isCaptain ? "#eab308" : "#fff",
                  fontSize: 9, fontWeight: 700,
                }}
              >
                {m.isCaptain ? <Star size={12} fill="#eab308" stroke="#eab308" /> : m.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>

              {/* Radio-hot outer pulse */}
              {bio.radio_hot && (
                <motion.div
                  className="absolute rounded-full pointer-events-none"
                  style={{ inset: -4, border: "1.5px solid #60a5fa" }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                />
              )}
            </motion.button>
          );
        })}

        {/* Label for center */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider"
          style={{ color: "#60a5fa" }}>
          tap any crew to buddy-up
        </div>
      </div>
    </div>
  );
}
