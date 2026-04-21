"use client";

import { Flame } from "lucide-react";
import AnalyticsCard, { MetaChip } from "./AnalyticsCard";

interface Row {
  call_sign: string;
  hours: { hr: number; util: number }[];
}

// Returns a color on blue→yellow→red scale
function colorFor(util: number): string {
  if (util <= 0) return "rgba(255,255,255,0.03)";
  const clamped = Math.min(1, util);
  if (clamped < 0.2) {
    // cool blue → teal
    const t = clamped / 0.2;
    return `rgba(${Math.round(59 + t * 5)}, ${Math.round(130 + t * 70)}, ${Math.round(246 - t * 100)}, ${0.3 + clamped})`;
  }
  if (clamped < 0.5) {
    // teal → yellow
    const t = (clamped - 0.2) / 0.3;
    return `rgba(${Math.round(64 + t * 170)}, ${Math.round(200 - t * 20)}, ${Math.round(146 - t * 128)}, ${0.45 + clamped * 0.3})`;
  }
  // yellow → red
  const t = (clamped - 0.5) / 0.5;
  return `rgba(${Math.round(234 + t * 5)}, ${Math.round(180 - t * 112)}, ${Math.round(20 + t * 48)}, ${0.6 + clamped * 0.3})`;
}

export default function UHUHeatmap({ uhu, span = 6 }: { uhu: Row[]; span?: number }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxUtil = uhu.reduce((m, r) => Math.max(m, ...r.hours.map((h) => h.util)), 0);
  const fatigueCells = uhu.reduce(
    (n, r) => n + r.hours.filter((h) => h.util >= 0.5).length,
    0
  );

  return (
    <AnalyticsCard
      title="Unit Hour Utilization"
      subtitle="Apparatus × hour-of-day · >0.5 flags fatigue risk (Fitch)"
      icon={Flame}
      accent="#ef4444"
      span={span}
      trailing={
        <MetaChip accent={fatigueCells > 0 ? "#ef4444" : "#22c55e"}>
          {fatigueCells} fatigue cells
        </MetaChip>
      }
      footer={<span>Peak UHU {Math.round(maxUtil * 100)}% · Target range 0.30–0.50</span>}
    >
      {uhu.length === 0 ? (
        <div className="flex items-center justify-center h-full text-[11px]" style={{ color: "#52525b" }}>
          No dispatch activity yet.
        </div>
      ) : (
        <div className="flex flex-col gap-[3px]">
          {/* Hour axis */}
          <div className="flex items-center gap-[3px] pl-[68px]">
            {hours.map((h) => (
              <div
                key={h}
                className="flex-1 text-center text-[8px] tabular-nums"
                style={{ color: h % 6 === 0 ? "#a1a1aa" : "transparent" }}
              >
                {h % 6 === 0 ? (h === 0 ? "12a" : h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`) : "·"}
              </div>
            ))}
          </div>
          {uhu.map((row) => (
            <div key={row.call_sign} className="flex items-center gap-[3px]">
              <div className="w-[64px] text-[10px] font-medium truncate text-white pr-1">{row.call_sign}</div>
              {row.hours.map((cell) => (
                <div
                  key={cell.hr}
                  className="group relative flex-1 h-5 rounded-[2px] cursor-default transition-all"
                  style={{
                    background: colorFor(cell.util),
                    boxShadow: cell.util >= 0.5 ? "0 0 6px rgba(239,68,68,0.4)" : "none",
                  }}
                  title={`${row.call_sign} · ${cell.hr}:00 · ${Math.round(cell.util * 100)}%`}
                />
              ))}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-1 mt-2 pl-[68px] text-[8px]" style={{ color: "#71717a" }}>
            <span>0%</span>
            <div className="flex-1 h-1.5 rounded-full" style={{
              background: "linear-gradient(90deg, rgba(59,130,246,0.4), rgba(34,197,94,0.6), #eab308, #f97316, #ef4444)",
            }} />
            <span>100%</span>
          </div>
        </div>
      )}
    </AnalyticsCard>
  );
}
