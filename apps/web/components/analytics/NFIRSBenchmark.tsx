"use client";

import { Scale } from "lucide-react";
import AnalyticsCard, { MetaChip } from "./AnalyticsCard";
import { NFIRS_BENCHMARK, NFIRS_SOURCE } from "@/lib/nfirs-benchmark";

interface Props {
  byType: { name: string; value: number }[];
  span?: number;
}

// Canonicalise "structure fire" ↔ "structure_fire"
function keyOf(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}

const TYPE_COLOR: Record<string, string> = {
  medical: "#3b82f6",
  false_alarm: "#71717a",
  structure_fire: "#ef4444",
  vehicle_fire: "#f97316",
  wildfire: "#eab308",
  hazmat: "#a855f7",
  rescue: "#22c55e",
  other: "#52525b",
};

export default function NFIRSBenchmark({ byType, span = 4 }: Props) {
  const total = Math.max(1, byType.reduce((a, b) => a + b.value, 0));
  const localPct: Record<string, number> = {};
  byType.forEach((t) => { localPct[keyOf(t.name)] = t.value / total; });

  const rows = NFIRS_BENCHMARK.map((b) => ({
    ...b,
    local_pct: localPct[b.type] ?? 0,
    delta: (localPct[b.type] ?? 0) - b.national_pct,
  })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return (
    <AnalyticsCard
      title="Incident Mix vs. NFIRS National"
      subtitle="Local distribution compared to the US federal baseline"
      icon={Scale}
      accent="#3b82f6"
      span={span}
      trailing={<MetaChip>NFIRS {NFIRS_SOURCE.year}</MetaChip>}
      footer={<span>Top deviation: {rows[0]?.label} ({(rows[0]?.delta * 100).toFixed(1)}pp)</span>}
    >
      <div className="space-y-2">
        {rows.slice(0, 6).map((r) => {
          const accent = TYPE_COLOR[r.type] ?? "#71717a";
          const deltaPp = Math.round(r.delta * 1000) / 10;
          return (
            <div key={r.type}>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="font-medium text-white">{r.label}</span>
                <span className="tabular-nums" style={{ color: Math.abs(deltaPp) >= 5 ? (deltaPp > 0 ? "#ef4444" : "#22c55e") : "#71717a" }}>
                  {deltaPp > 0 ? "+" : ""}{deltaPp}pp
                </span>
              </div>
              <div className="relative h-[14px] rounded-sm overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                {/* National baseline (ghost) */}
                <div
                  className="absolute inset-y-0 left-0 rounded-sm"
                  style={{
                    width: `${Math.min(100, r.national_pct * 100)}%`,
                    background: `${accent}22`,
                    borderRight: `1px dashed ${accent}80`,
                  }}
                />
                {/* Local value */}
                <div
                  className="absolute inset-y-0 left-0 rounded-sm transition-all"
                  style={{
                    width: `${Math.min(100, r.local_pct * 100)}%`,
                    background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[8px] mt-0.5" style={{ color: "#52525b" }}>
                <span>local {(r.local_pct * 100).toFixed(1)}%</span>
                <span>national {(r.national_pct * 100).toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </AnalyticsCard>
  );
}
