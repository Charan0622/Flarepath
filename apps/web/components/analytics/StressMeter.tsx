"use client";

import { Gauge, Zap } from "lucide-react";
import AnalyticsCard, { MetaChip } from "./AnalyticsCard";

interface Stress {
  active_incidents: number;
  critical_incidents: number;
  active_dispatches: number;
  available_units: number;
  total_units: number;
  pressure_pct: number;
}

export default function StressMeter({ stress, span = 3 }: { stress: Stress; span?: number }) {
  const pct = stress.pressure_pct;
  const level = pct >= 80 ? "critical" : pct >= 60 ? "high" : pct >= 40 ? "elevated" : "nominal";
  const color = pct >= 80 ? "#ef4444" : pct >= 60 ? "#f97316" : pct >= 40 ? "#eab308" : "#22c55e";

  return (
    <AnalyticsCard
      title="System Pressure"
      subtitle="Concurrent incident load vs. available units"
      icon={Gauge}
      accent={color}
      span={span}
      trailing={<MetaChip accent={color}>{level.toUpperCase()}</MetaChip>}
      footer={<span>{stress.active_dispatches} dispatches · {stress.available_units}/{stress.total_units} units ready</span>}
    >
      <div className="flex flex-col justify-center h-full">
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-[42px] font-bold tabular-nums leading-none" style={{ color }}>
            {pct}
          </span>
          <span className="text-[14px] font-semibold" style={{ color }}>%</span>
          {pct >= 80 && (
            <Zap size={14} className="ml-1" style={{ color: "#ef4444", filter: "drop-shadow(0 0 6px rgba(239,68,68,0.6))" }} />
          )}
        </div>

        {/* Pressure bar */}
        <div
          className="h-2 rounded-full overflow-hidden relative"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <div
            className="h-full rounded-full relative transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, #22c55e 0%, #eab308 50%, #ef4444 100%)`,
              boxShadow: pct >= 80 ? "0 0 10px rgba(239,68,68,0.6)" : "none",
            }}
          />
          {/* Threshold marker at 80% */}
          <div
            className="absolute top-[-2px] bottom-[-2px] w-px"
            style={{ left: "80%", background: "rgba(239,68,68,0.5)" }}
          />
        </div>

        <div className="flex items-center justify-between mt-3 text-[9px] uppercase tracking-wider" style={{ color: "#52525b" }}>
          <span>0</span>
          <span>aid threshold</span>
          <span>100</span>
        </div>

        {stress.critical_incidents > 0 && (
          <div
            className="mt-3 px-2 py-1.5 rounded-md flex items-center gap-1.5"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <span className="relative w-1.5 h-1.5 shrink-0">
              <span className="absolute inset-0 rounded-full bg-[#ef4444] animate-ping opacity-60" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            </span>
            <span className="text-[10px] font-semibold text-[#ef4444]">
              {stress.critical_incidents} critical active
            </span>
          </div>
        )}
      </div>
    </AnalyticsCard>
  );
}
