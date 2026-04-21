"use client";

import { Sparkles } from "lucide-react";
import { ComposedChart, Area, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts";
import AnalyticsCard, { MetaChip } from "./AnalyticsCard";

interface Props {
  history: { label: string; actual: number }[];
  forecast: { label: string; predicted: number; p_low: number; p_high: number }[];
  span?: number;
}

export default function IncidentForecast({ history, forecast, span = 4 }: Props) {
  // Merge history + forecast into one series so the chart renders continuously
  const series = [
    ...history.map((h) => ({ label: h.label, actual: h.actual, predicted: null, p_low: null, p_high: null })),
    { label: "Now", actual: null, predicted: null, p_low: null, p_high: null, isNow: true },
    ...forecast.map((f) => ({ label: f.label, actual: null, predicted: f.predicted, p_low: f.p_low, p_high: f.p_high })),
  ];

  const peakPredicted = forecast.reduce((max, f) => Math.max(max, f.predicted), 0);
  const peakHour = forecast.find((f) => f.predicted === peakPredicted)?.label;

  return (
    <AnalyticsCard
      title="4-Hour Forecast"
      subtitle="Seasonal-naive prediction of incident volume"
      icon={Sparkles}
      accent="#a855f7"
      span={span}
      trailing={<MetaChip accent="#a855f7">ML</MetaChip>}
      footer={peakHour && <span>Peak expected at {peakHour} · ~{peakPredicted.toFixed(1)} incidents/hr</span>}
    >
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="f-band" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="f-actual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: "#52525b", fontSize: 9 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#52525b", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={24}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ background: "#0a0a0e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, fontSize: 11 }}
              labelStyle={{ color: "#e4e4e7" }}
            />
            <ReferenceLine x="Now" stroke="#a1a1aa" strokeDasharray="2 2" label={{ value: "now", fontSize: 9, fill: "#a1a1aa", position: "top" }} />

            {/* Confidence band */}
            <Area type="monotone" dataKey="p_high" stackId="band" stroke="none" fill="url(#f-band)" isAnimationActive />
            <Area type="monotone" dataKey="p_low" stackId="band" stroke="none" fill="#0a0a0e" />

            {/* Actual line */}
            <Line type="monotone" dataKey="actual" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} connectNulls={false} />
            {/* Predicted line */}
            <Line type="monotone" dataKey="predicted" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 3" dot={{ fill: "#a855f7", r: 3 }} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-3 mt-2 text-[9px]" style={{ color: "#71717a" }}>
        <span className="flex items-center gap-1"><span className="w-2 h-0.5" style={{ background: "#22c55e" }} />actual</span>
        <span className="flex items-center gap-1"><span className="w-2 h-0.5" style={{ background: "#a855f7", borderTop: "1px dashed #a855f7" }} />predicted</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: "rgba(168,85,247,0.25)" }} />confidence</span>
      </div>
    </AnalyticsCard>
  );
}
