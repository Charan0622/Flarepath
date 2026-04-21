"use client";

import { Target, AlertTriangle, CheckCircle2 } from "lucide-react";
import AnalyticsCard, { MetaChip } from "./AnalyticsCard";

interface NFPA {
  call_processing: { p50: number | null; p80: number | null; p90: number | null; target: number; samples: number };
  turnout: { p50: number | null; p80: number | null; p90: number | null; target: number; samples: number };
  travel: { p50: number | null; p80: number | null; p90: number | null; target: number; samples: number };
  total: { p50: number | null; p80: number | null; p90: number | null; p99: number | null; target: number; samples: number };
}

function fmt(s: number | null): string {
  if (s === null || s === undefined) return "—";
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

function Segment({ label, actual, target, accent }: { label: string; actual: number | null; target: number; accent: string }) {
  const pct = actual === null ? 0 : Math.min(150, (actual / target) * 100);
  const overBudget = (actual ?? 0) > target;
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: "#71717a" }}>{label}</span>
        <span className="text-[10px] tabular-nums" style={{ color: overBudget ? "#ef4444" : "#a1a1aa" }}>
          {fmt(actual)}<span className="opacity-50"> / {fmt(target)}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: overBudget
              ? "linear-gradient(90deg, #f97316, #ef4444)"
              : `linear-gradient(90deg, ${accent}, ${accent}cc)`,
            boxShadow: overBudget ? "0 0 12px rgba(239,68,68,0.5)" : undefined,
          }}
        />
      </div>
    </div>
  );
}

export default function NFPAGauge({ nfpa, span = 6 }: { nfpa: NFPA; span?: number }) {
  const total90 = nfpa.total.p90;
  const target = nfpa.total.target;
  const compliant = total90 !== null && total90 <= target;
  const ratio = total90 !== null ? total90 / target : 0;
  const arcLen = 220; // degrees of sweep
  // Map ratio to arc sweep — 0 → 0°, 1 → full arc, >1 → overshoot clamped
  const sweep = Math.min(1.15, ratio) * arcLen;

  return (
    <AnalyticsCard
      title="NFPA 1710 Compliance"
      subtitle="90th-percentile total response time vs. the 6:30 federal benchmark"
      icon={Target}
      accent="#ef4444"
      span={span}
      trailing={<MetaChip accent={compliant ? "#22c55e" : "#ef4444"}>
        {compliant ? <><CheckCircle2 size={9} /> Compliant</> : <><AlertTriangle size={9} /> Breach</>}
      </MetaChip>}
      footer={<span>Source: NFPA 1710 §4.1.2 · target 390s at p90 across {nfpa.total.samples} dispatches</span>}
    >
      <div className="flex items-center gap-4">
        {/* Radial gauge */}
        <div className="relative shrink-0" style={{ width: 150, height: 150 }}>
          <svg width={150} height={150} viewBox="0 0 150 150">
            <defs>
              <linearGradient id="gauge-bg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            {/* Background arc */}
            <path
              d="M 20 110 A 60 60 0 1 1 130 110"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Color gradient arc */}
            <path
              d="M 20 110 A 60 60 0 1 1 130 110"
              fill="none"
              stroke="url(#gauge-bg)"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.25"
            />
            {/* Value arc */}
            <path
              d="M 20 110 A 60 60 0 1 1 130 110"
              fill="none"
              stroke={compliant ? "#22c55e" : "#ef4444"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${sweep} 500`}
              pathLength={arcLen}
              style={{
                filter: compliant
                  ? "drop-shadow(0 0 8px rgba(34,197,94,0.5))"
                  : "drop-shadow(0 0 10px rgba(239,68,68,0.7))",
                transition: "stroke-dasharray 600ms ease",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[24px] font-bold text-white tabular-nums leading-none">
              {fmt(total90)}
            </span>
            <span className="text-[9px] uppercase tracking-widest mt-1" style={{ color: compliant ? "#22c55e" : "#ef4444" }}>
              p90 total
            </span>
            <span className="text-[9px] mt-0.5 tabular-nums" style={{ color: "#52525b" }}>
              target {fmt(target)}
            </span>
          </div>
        </div>

        {/* Segment bars */}
        <div className="flex-1 space-y-3 min-w-0">
          <Segment label="Call processing" actual={nfpa.call_processing.p90} target={nfpa.call_processing.target} accent="#3b82f6" />
          <Segment label="Turnout" actual={nfpa.turnout.p90} target={nfpa.turnout.target} accent="#eab308" />
          <Segment label="Travel" actual={nfpa.travel.p90} target={nfpa.travel.target} accent="#f97316" />
          <Segment label="Total" actual={nfpa.total.p90} target={nfpa.total.target} accent="#ef4444" />
        </div>
      </div>
    </AnalyticsCard>
  );
}
