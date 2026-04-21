"use client";

import { useEffect, useState } from "react";
import { Heart, Thermometer, Wind, Radio, AlertTriangle, Shield, Star } from "lucide-react";
import type { CrewMember } from "@/lib/crew-data";
import { synthesizeBiometric } from "@/lib/chief-data";
import { useChief } from "@/lib/chief-store";

interface Props {
  captain: CrewMember | null;
  members: CrewMember[];
}

const STATUS_COLOR: Record<string, string> = {
  nominal: "#22c55e",
  elevated: "#eab308",
  warning: "#f97316",
  critical: "#ef4444",
};

function fmtDur(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function VitalsPanel({ captain, members }: Props) {
  const { state } = useChief();
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  const assignmentByBadge = new Map<string, string>();
  state.assignments.forEach((a) => assignmentByBadge.set(a.badge, a.task));

  const all = [captain, ...members].filter(Boolean) as CrewMember[];

  return (
    <div className="h-full flex flex-col gap-2 overflow-auto">
      <div className="flex items-center gap-3 text-[9px] uppercase tracking-wider pb-1 mb-1" style={{ color: "#71717a", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="w-4" />
        <div className="min-w-[110px]">Member</div>
        <div className="flex-1 flex items-center gap-4">
          <span className="flex items-center gap-1 min-w-[60px]"><Heart size={9} /> HR</span>
          <span className="flex items-center gap-1 min-w-[64px]"><Thermometer size={9} /> Core</span>
          <span className="flex items-center gap-1 flex-1 min-w-[160px]"><Wind size={9} /> SCBA Air</span>
          <span className="flex items-center gap-1 min-w-[40px]"><Radio size={9} /> RF</span>
          <span className="min-w-[72px] text-right">Activity</span>
        </div>
      </div>

      {all.map((m) => {
        const leader = captain && m.badge === captain.badge;
        const assignmentTask = assignmentByBadge.get(m.badge);
        const activity = assignmentTask === "rit_standby" ? "rit"
          : assignmentByBadge.has(m.badge) ? "interior"
          : leader ? "interior" : "staged";
        const bio = synthesizeBiometric(m.badge, activity);
        const airPct = Math.max(0, Math.min(100, (bio.air_psi / 4500) * 100));
        const statusColor = STATUS_COLOR[bio.status];

        return (
          <div
            key={m.badge}
            className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-white/[0.02]"
            style={{
              background: bio.status === "critical" ? "rgba(239,68,68,0.06)" : "transparent",
              border: bio.status === "critical" ? "1px solid rgba(239,68,68,0.3)" : "1px solid transparent",
            }}
          >
            {/* Status dot */}
            <div className="relative w-2.5 h-2.5 rounded-full shrink-0" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }}>
              {bio.status === "critical" && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "#ef4444", opacity: 0.6 }} />}
            </div>

            {/* Name + rank */}
            <div className="min-w-[110px] flex items-center gap-1.5">
              {leader ? <Star size={11} fill="#eab308" stroke="#eab308" /> : <Shield size={10} style={{ color: "#a1a1aa" }} />}
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-white truncate">{m.name.split(" ")[0]} {m.name.split(" ").slice(-1)[0][0]}.</div>
                <div className="text-[9px]" style={{ color: "#71717a" }}>{leader ? "Captain" : m.rank.split("/")[0]}</div>
              </div>
            </div>

            {/* Telemetry */}
            <div className="flex-1 flex items-center gap-4 min-w-0">
              <Metric value={`${bio.heart_rate}`} unit="bpm" color={bio.heart_rate > 160 ? "#ef4444" : bio.heart_rate > 140 ? "#f97316" : "#e4e4e7"} />
              <Metric value={bio.core_temp_c.toFixed(1)} unit="°C" color={bio.core_temp_c > 38 ? "#ef4444" : bio.core_temp_c > 37.5 ? "#f97316" : "#e4e4e7"} />

              {/* Air bar */}
              <div className="flex-1 flex items-center gap-2 min-w-[140px]">
                <div className="relative h-1.5 rounded-full flex-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{
                      width: `${airPct}%`,
                      background: airPct > 55 ? "linear-gradient(90deg, #22c55e, #16a34a)" : airPct > 30 ? "linear-gradient(90deg, #eab308, #ca8a04)" : "linear-gradient(90deg, #ef4444, #991b1b)",
                      boxShadow: airPct < 30 ? "0 0 8px rgba(239,68,68,0.5)" : "none",
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono tabular-nums w-14 text-right" style={{ color: airPct < 30 ? "#ef4444" : airPct < 55 ? "#eab308" : "#a1a1aa" }}>
                  {bio.air_psi} psi
                </span>
                <span className="text-[9px] font-mono tabular-nums w-10 text-right" style={{ color: "#71717a" }}>
                  {fmtDur(bio.air_time_remaining_s)}
                </span>
              </div>

              {/* Radio */}
              <div className="w-10 flex justify-center">
                <div
                  className="w-6 h-3 rounded-full flex items-center justify-center"
                  style={{
                    background: bio.radio_hot ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.04)",
                    border: bio.radio_hot ? "1px solid #60a5fa" : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: bio.radio_hot ? "0 0 6px rgba(59,130,246,0.5)" : "none",
                  }}
                >
                  {bio.radio_hot && <div className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />}
                </div>
              </div>

              {/* Activity */}
              <div className="w-18 text-right">
                <span className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold"
                  style={{
                    background: activity === "interior" ? "rgba(239,68,68,0.15)"
                      : activity === "rit" ? "rgba(34,197,94,0.15)"
                      : "rgba(255,255,255,0.05)",
                    color: activity === "interior" ? "#ef4444"
                      : activity === "rit" ? "#22c55e"
                      : "#a1a1aa",
                  }}
                >
                  {activity}
                </span>
              </div>
            </div>

            {bio.status === "critical" && (
              <AlertTriangle size={11} style={{ color: "#ef4444" }} className="shrink-0" />
            )}
          </div>
        );
      })}

      <div className="mt-2 pt-2 text-[9px]" style={{ color: "#71717a", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span>● synthetic telemetry (replace with MSA LUNAR / Apple Watch feed)</span>
          <span>· thresholds: HR &gt;160 bpm warn · core &gt;38°C warn · PSI &lt;1200 critical</span>
        </div>
      </div>
    </div>
  );
}

function Metric({ value, unit, color }: { value: string; unit: string; color: string }) {
  return (
    <div className="flex items-baseline gap-1 font-mono tabular-nums min-w-[56px]" style={{ color }}>
      <span className="text-[12px] font-bold">{value}</span>
      <span className="text-[9px] opacity-60">{unit}</span>
    </div>
  );
}
