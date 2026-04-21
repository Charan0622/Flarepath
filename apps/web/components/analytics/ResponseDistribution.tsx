"use client";

import { BarChart3 } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts";
import AnalyticsCard from "./AnalyticsCard";

interface Props {
  distribution: { bucket: string; bucket_start: number; count: number }[];
  nfpa: { travel: { p50: number | null; p80: number | null; p90: number | null; target: number } };
  span?: number;
}

export default function ResponseDistribution({ distribution, nfpa, span = 4 }: Props) {
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));
  const p50Bucket = nfpa.travel.p50 !== null ? Math.floor(nfpa.travel.p50 / 30) : null;
  const p90Bucket = nfpa.travel.p90 !== null ? Math.floor(nfpa.travel.p90 / 30) : null;
  const targetBucket = Math.floor(nfpa.travel.target / 30);

  const colorFor = (start: number) => {
    if (start < 120) return "#22c55e";
    if (start < 240) return "#eab308";
    if (start < 360) return "#f97316";
    return "#ef4444";
  };

  return (
    <AnalyticsCard
      title="Response-Time Distribution"
      subtitle="Travel time histogram with percentile markers"
      icon={BarChart3}
      accent="#f97316"
      span={span}
      footer={<span>p50 {fmt(nfpa.travel.p50)} · p90 {fmt(nfpa.travel.p90)} · NFPA target {fmt(nfpa.travel.target)}</span>}
    >
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 8, right: 8, bottom: 20, left: 0 }}>
            <XAxis
              dataKey="bucket"
              tick={{ fill: "#52525b", fontSize: 9 }}
              interval={1}
              angle={-30}
              textAnchor="end"
              height={40}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#52525b", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={28}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={{ background: "#0a0a0e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, fontSize: 11 }}
              labelStyle={{ color: "#e4e4e7" }}
            />
            {p50Bucket !== null && (
              <ReferenceLine x={distribution[p50Bucket]?.bucket} stroke="#a1a1aa" strokeDasharray="2 2" label={{ value: "p50", position: "top", fontSize: 9, fill: "#a1a1aa" }} />
            )}
            <ReferenceLine x={distribution[targetBucket]?.bucket} stroke="#eab308" strokeDasharray="3 3" label={{ value: "NFPA", position: "top", fontSize: 9, fill: "#eab308" }} />
            {p90Bucket !== null && (
              <ReferenceLine x={distribution[p90Bucket]?.bucket} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "p90", position: "top", fontSize: 9, fill: "#ef4444" }} />
            )}
            <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={24}>
              {distribution.map((d, i) => (
                <Cell key={i} fill={colorFor(d.bucket_start)} fillOpacity={d.count === maxCount ? 0.95 : 0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
}

function fmt(s: number | null): string {
  if (s === null || s === undefined) return "—";
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}
