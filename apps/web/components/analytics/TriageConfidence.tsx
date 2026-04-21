"use client";

import { Brain, Check } from "lucide-react";
import AnalyticsCard, { MetaChip } from "./AnalyticsCard";

interface Props {
  triage: {
    samples: number;
    avg_confidence: number | null;
    agreement_rate: number | null;
    by_severity: Record<string, number[]>;
    bins: Record<string, number>;
  };
  span?: number;
}

const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};

// Mini violin/box — represent each severity as a horizontal bar spanning min→max
// of confidence values, with a dot at the median.
function Violin({ values, color }: { values: number[]; color: string }) {
  if (values.length === 0) return <div className="h-6 text-[10px]" style={{ color: "#52525b" }}>no samples</div>;
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];

  const scale = (v: number) => (v / 100) * 100;

  return (
    <div className="relative h-6 flex items-center">
      <div className="absolute inset-y-0 left-0 right-0 flex items-center">
        {/* min-max line */}
        <div
          className="absolute h-px"
          style={{
            left: `${scale(min)}%`, width: `${scale(max - min)}%`,
            background: `${color}66`,
          }}
        />
        {/* IQR box */}
        <div
          className="absolute h-2.5 rounded-sm"
          style={{
            left: `${scale(p25)}%`, width: `${Math.max(2, scale(p75 - p25))}%`,
            background: `${color}33`, border: `1px solid ${color}`,
          }}
        />
        {/* Median dot */}
        <div
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            left: `calc(${scale(median)}% - 3px)`, background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

export default function TriageConfidence({ triage, span = 4 }: Props) {
  const agreePct = triage.agreement_rate !== null ? Math.round(triage.agreement_rate * 100) : null;
  const avgPct = triage.avg_confidence !== null ? Math.round(triage.avg_confidence * 100) : null;

  return (
    <AnalyticsCard
      title="AI Triage Confidence"
      subtitle="Gemini prediction quality by severity class"
      icon={Brain}
      accent="#a855f7"
      span={span}
      trailing={
        agreePct !== null ? (
          <MetaChip accent={agreePct >= 85 ? "#22c55e" : agreePct >= 70 ? "#eab308" : "#ef4444"}>
            <Check size={9} /> {agreePct}% agree
          </MetaChip>
        ) : null
      }
      footer={<span>{triage.samples} triage calls · avg confidence {avgPct ?? "—"}%</span>}
    >
      {triage.samples === 0 ? (
        <div className="flex items-center justify-center h-full text-[11px]" style={{ color: "#52525b" }}>
          AI triage not run yet.
        </div>
      ) : (
        <div className="space-y-2">
          {(["critical", "high", "medium", "low"] as const).map((sev) => {
            const vals = triage.by_severity[sev] ?? [];
            return (
              <div key={sev} className="flex items-center gap-2">
                <span className="w-14 text-[9px] uppercase tracking-wider font-semibold" style={{ color: SEV_COLOR[sev] }}>
                  {sev}
                </span>
                <div className="flex-1">
                  <Violin values={vals} color={SEV_COLOR[sev]} />
                </div>
                <span className="w-8 text-right text-[10px] tabular-nums" style={{ color: "#71717a" }}>
                  {vals.length}
                </span>
              </div>
            );
          })}
          <div className="flex items-center justify-between mt-2 pt-2 text-[8px] uppercase tracking-wider" style={{ color: "#52525b", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <span>0%</span>
            <span>confidence</span>
            <span>100%</span>
          </div>
        </div>
      )}
    </AnalyticsCard>
  );
}
