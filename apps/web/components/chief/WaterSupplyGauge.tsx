"use client";

import { Droplets } from "lucide-react";
import { useChief } from "@/lib/chief-store";

const SOURCES = [
  { key: "hydrant" as const, label: "Hydrant" },
  { key: "tanker" as const,  label: "Tanker"  },
  { key: "draft" as const,   label: "Draft"   },
];

export default function WaterSupplyGauge() {
  const { state, updateWater } = useChief();
  const { source, gpm, residual_psi } = state.waterSupply;

  const gpmPct = Math.min(100, (gpm / 1500) * 100);
  const psiPct = Math.min(100, (residual_psi / 80) * 100);

  return (
    <div className="glass-card rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Droplets size={12} style={{ color: "#06b6d4" }} />
          <span className="text-[11px] font-semibold text-white">Water Supply</span>
        </div>
        <span className="text-[9px]" style={{ color: source ? "#22c55e" : "#ef4444" }}>
          {source ? "● Supply established" : "○ Not established"}
        </span>
      </div>

      <div className="flex items-center gap-1 mb-2">
        {SOURCES.map((s) => (
          <button
            key={s.key}
            onClick={() => updateWater({ source: source === s.key ? null : s.key })}
            className="flex-1 text-[9px] font-semibold py-1 rounded transition-colors"
            style={{
              background: source === s.key ? "rgba(6,182,212,0.18)" : "rgba(255,255,255,0.03)",
              color: source === s.key ? "#06b6d4" : "#a1a1aa",
              border: source === s.key ? "1px solid rgba(6,182,212,0.4)" : "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[9px] mb-0.5">
            <span style={{ color: "#71717a" }}>GPM flowing</span>
            <span className="tabular-nums font-semibold" style={{ color: "#06b6d4" }}>{gpm}</span>
          </div>
          <input
            type="range" min={0} max={2000} step={25} value={gpm}
            onChange={(e) => updateWater({ gpm: Number(e.target.value) })}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(90deg, #06b6d4 ${gpmPct}%, rgba(255,255,255,0.06) ${gpmPct}%)`,
            }}
          />
        </div>
        <div>
          <div className="flex justify-between text-[9px] mb-0.5">
            <span style={{ color: "#71717a" }}>Residual PSI</span>
            <span className="tabular-nums font-semibold" style={{ color: residual_psi < 20 ? "#ef4444" : "#06b6d4" }}>
              {residual_psi}
            </span>
          </div>
          <input
            type="range" min={0} max={120} step={1} value={residual_psi}
            onChange={(e) => updateWater({ residual_psi: Number(e.target.value) })}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(90deg, ${residual_psi < 20 ? "#ef4444" : "#06b6d4"} ${psiPct}%, rgba(255,255,255,0.06) ${psiPct}%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
