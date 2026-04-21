"use client";

import { Route } from "lucide-react";
import AnalyticsCard, { MetaChip } from "./AnalyticsCard";

interface Props {
  eta: {
    samples: number;
    accuracy_pct: number | null;
    avg_diff_s: number | null;
    points: { planned_s: number; actual_s: number; diff: number }[];
  };
  span?: number;
}

export default function RouteEfficiency({ eta, span = 3 }: Props) {
  const acc = eta.accuracy_pct ?? 0;
  const avgDiff = eta.avg_diff_s;
  const color = acc >= 90 ? "#22c55e" : acc >= 75 ? "#eab308" : "#ef4444";

  // Plot planned vs actual as a tiny dual-line sparkline-ish
  const points = eta.points.slice(-30);
  const max = Math.max(1, ...points.flatMap((p) => [p.planned_s, p.actual_s]));
  const w = 160;
  const h = 50;
  const pathFor = (accessor: (p: { planned_s: number; actual_s: number }) => number) =>
    points
      .map((p, i) => {
        const x = (i / Math.max(1, points.length - 1)) * w;
        const y = h - (accessor(p) / max) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <AnalyticsCard
      title="Route & ETA Accuracy"
      subtitle="How close Mapbox ETAs matched actual arrivals"
      icon={Route}
      accent={color}
      span={span}
      trailing={<MetaChip accent={color}>{acc}%</MetaChip>}
      footer={<span>{eta.samples} arrivals · avg drift {avgDiff !== null ? (avgDiff > 0 ? "+" : "") + avgDiff + "s" : "—"}</span>}
    >
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[30px] font-bold tabular-nums leading-none" style={{ color }}>
              {acc}
            </span>
            <span className="text-[11px] font-semibold" style={{ color }}>%</span>
            <span className="text-[10px] ml-1" style={{ color: "#71717a" }}>within ±60s</span>
          </div>
        </div>

        {points.length >= 2 ? (
          <div className="relative">
            <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block", height: 56 }}>
              <path d={pathFor((p) => p.planned_s)} fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="3 2" />
              <path d={pathFor((p) => p.actual_s)} fill="none" stroke="#ef4444" strokeWidth="1.4" />
            </svg>
            <div className="flex items-center gap-2 mt-1 text-[8px]" style={{ color: "#71717a" }}>
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 border-t border-dashed" style={{ borderColor: "#3b82f6" }} />planned</span>
              <span className="flex items-center gap-1"><span className="w-2 h-0.5" style={{ background: "#ef4444" }} />actual</span>
            </div>
          </div>
        ) : (
          <div className="text-[10px]" style={{ color: "#52525b" }}>awaiting more arrivals</div>
        )}
      </div>
    </AnalyticsCard>
  );
}
