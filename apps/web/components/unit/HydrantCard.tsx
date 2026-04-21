"use client";

import { Droplets } from "lucide-react";
import { nearestHydrants } from "@/lib/chief-data";

interface Props {
  incidentCoords: [number, number] | null;
}

export default function HydrantCard({ incidentCoords }: Props) {
  if (!incidentCoords) return null;
  const hydrants = nearestHydrants(incidentCoords[0], incidentCoords[1], 3);

  return (
    <div className="mx-3">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Droplets size={11} style={{ color: "#06b6d4" }} />
        <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#a1a1aa" }}>Nearest Hydrants</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {hydrants.map((h, i) => {
          const flowColor = h.flow_gpm >= 1250 ? "#22c55e" : h.flow_gpm >= 900 ? "#eab308" : "#f97316";
          return (
            <div
              key={h.id}
              className="rounded-lg p-2.5"
              style={{
                background: i === 0
                  ? "linear-gradient(135deg, rgba(6,182,212,0.14), rgba(6,182,212,0.03))"
                  : "rgba(255,255,255,0.02)",
                border: `1px solid ${i === 0 ? "rgba(6,182,212,0.35)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: "#06b6d4",
                    boxShadow: "0 0 6px rgba(6,182,212,0.6)",
                    border: "1.5px solid #0a0a0e",
                  }}
                >
                  <span className="text-[8px] font-bold text-[#0a0a0e]">{i + 1}</span>
                </div>
                <span
                  className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
                  style={{ background: `${flowColor}20`, color: flowColor }}
                >
                  {h.flow_gpm >= 1250 ? "BLUE" : h.flow_gpm >= 900 ? "GRN" : "ORNG"}
                </span>
              </div>
              <div className="text-[14px] font-bold tabular-nums" style={{ color: "#06b6d4" }}>
                {h.flow_gpm}
                <span className="text-[9px] opacity-70 ml-0.5">gpm</span>
              </div>
              <div className="text-[10px] font-mono tabular-nums mt-0.5" style={{ color: "#71717a" }}>
                {h.distance_m}m away
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
