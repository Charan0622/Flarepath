"use client";

import { Trophy } from "lucide-react";
import AnalyticsCard, { MetaChip } from "./AnalyticsCard";

interface StationRow {
  station: string;
  p90: number;
  p50: number;
  samples: number;
  target: number;
  trend: { i: number; value: number }[];
}

function Sparkline({ points, color }: { points: { i: number; value: number }[]; color: string }) {
  if (points.length < 2) return null;
  const w = 40;
  const h = 16;
  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const range = Math.max(1, max - min);
  const path = points
    .map((p, idx) => {
      const x = (idx / (points.length - 1)) * w;
      const y = h - ((p.value - min) / range) * h;
      return `${idx === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <path d={path} fill="none" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

export default function TurnoutLeaderboard({ rows, span = 4 }: { rows: StationRow[]; span?: number }) {
  const best = rows[0];
  const worst = rows.length > 0 ? rows[rows.length - 1] : null;

  return (
    <AnalyticsCard
      title="Turnout Leaderboard"
      subtitle="p90 dispatch → en-route time, ranked"
      icon={Trophy}
      accent="#eab308"
      span={span}
      trailing={<MetaChip accent="#eab308">NFPA target 80s</MetaChip>}
      footer={best && worst ? <span>Best: {best.station} ({best.p90}s) · Gap to worst: {worst.p90 - best.p90}s</span> : <span>—</span>}
    >
      {rows.length === 0 ? (
        <div className="flex items-center justify-center h-full text-[11px]" style={{ color: "#52525b" }}>
          No completed turnouts on file yet.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, idx) => {
            const overBudget = r.p90 > r.target;
            const pct = Math.min(100, (r.p90 / (r.target * 2)) * 100);
            const color = overBudget ? "#ef4444" : r.p90 <= r.target * 0.75 ? "#22c55e" : "#eab308";
            return (
              <div key={r.station} className="group relative">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="w-4 text-[10px] font-bold tabular-nums" style={{ color: idx === 0 ? "#eab308" : "#71717a" }}>
                    {idx + 1}
                  </span>
                  <span className="flex-1 truncate text-white font-medium">{r.station}</span>
                  <Sparkline points={r.trend} color={color} />
                  <span className="w-10 text-right font-mono tabular-nums" style={{ color }}>
                    {r.p90}s
                  </span>
                </div>
                <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                    }}
                  />
                  <div
                    className="absolute h-1 w-px"
                    style={{ left: `calc(${(r.target / (r.target * 2)) * 100}% + 6rem)`, background: "rgba(255,255,255,0.15)" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AnalyticsCard>
  );
}
