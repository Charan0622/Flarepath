"use client";

import { motion } from "framer-motion";
import { synthesizeBiometric } from "@/lib/chief-data";
import { Star } from "lucide-react";

interface Props {
  badge: string;
  name: string;
  isCaptain?: boolean;
  activity?: "staged" | "en_route" | "interior" | "exterior" | "rit";
  size?: number;
}

// Personal HUD gauge — rings around the firefighter avatar:
//   inner ring → heart-rate halo (pulses at BPM)
//   middle ring → SCBA air remaining (circular progress, EOSTI)
//   outer ring → radio-hot glow
export default function AvatarGauge({ badge, name, isCaptain = false, activity = "interior", size = 180 }: Props) {
  const bio = synthesizeBiometric(badge, activity);
  const airPct = Math.max(0, Math.min(100, (bio.air_psi / 4500) * 100));
  const hrPeriod = Math.max(400, 60_000 / bio.heart_rate);
  const initial = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const STATUS_COLOR: Record<string, string> = {
    nominal: "#22c55e",
    elevated: "#eab308",
    warning: "#f97316",
    critical: "#ef4444",
  };
  const statusColor = STATUS_COLOR[bio.status];
  const airColor = airPct > 66 ? "#22c55e" : airPct > 33 ? "#eab308" : "#ef4444";
  const radius = (size - 20) / 2;
  const circ = 2 * Math.PI * radius;

  const airEmptySeconds = bio.air_time_remaining_s;
  const airMin = Math.floor(airEmptySeconds / 60);
  const airSec = airEmptySeconds % 60;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Outer: radio-hot glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -12,
          border: `1.5px solid ${bio.radio_hot ? "#60a5fa" : "rgba(255,255,255,0.06)"}`,
          boxShadow: bio.radio_hot ? "0 0 20px rgba(59,130,246,0.65)" : "none",
        }}
        animate={{ opacity: bio.radio_hot ? [0.4, 1, 0.4] : 0.3 }}
        transition={{ duration: bio.radio_hot ? 0.6 : 0.3, repeat: bio.radio_hot ? Infinity : 0 }}
      />

      {/* Middle: SCBA air ring */}
      <svg className="absolute pointer-events-none" style={{ inset: 0, width: size, height: size }} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="air-ring-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={airColor} stopOpacity="1" />
            <stop offset="100%" stopColor={airColor} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="url(#air-ring-grad)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${(airPct / 100) * circ} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: airPct < 33 ? `drop-shadow(0 0 8px ${airColor})` : undefined, transition: "stroke-dasharray 600ms ease" }}
        />
      </svg>

      {/* Inner: HR heartbeat halo */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: 10,
          border: `2px solid ${statusColor}`,
          boxShadow: `0 0 14px ${statusColor}80`,
        }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: hrPeriod / 1000, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Avatar body */}
      <div
        className="absolute flex items-center justify-center rounded-full"
        style={{
          inset: 20,
          background: isCaptain
            ? "linear-gradient(135deg, rgba(234,179,8,0.35), rgba(234,179,8,0.1))"
            : "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))",
          border: `1.5px solid ${isCaptain ? "rgba(234,179,8,0.55)" : "rgba(255,255,255,0.14)"}`,
          backdropFilter: "blur(8px)",
          color: isCaptain ? "#eab308" : "#fff",
          fontSize: size * 0.18,
          fontWeight: 800,
          letterSpacing: "0.04em",
        }}
      >
        {isCaptain ? <Star size={size * 0.26} fill="#eab308" stroke="#eab308" /> : initial}
      </div>

      {/* Air label chip */}
      <div
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
        style={{
          bottom: -18,
          background: "rgba(8,8,14,0.92)",
          color: airColor,
          border: `1px solid ${airColor}60`,
          boxShadow: `0 2px 10px ${airColor}40`,
        }}
      >
        <span className="font-mono tabular-nums">{bio.air_psi}</span>
        <span className="opacity-70">psi</span>
        <span className="opacity-50 ml-1">·</span>
        <span className="font-mono tabular-nums">{airMin}:{String(airSec).padStart(2, "0")}</span>
      </div>

      {/* Status dot */}
      <div
        className="absolute rounded-full"
        style={{
          top: 16, right: 16,
          width: 12, height: 12,
          background: statusColor,
          boxShadow: `0 0 8px ${statusColor}`,
          border: "2px solid #0a0a0e",
        }}
      />
    </div>
  );
}
