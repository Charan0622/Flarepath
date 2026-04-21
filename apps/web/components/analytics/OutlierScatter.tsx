"use client";

import { AlertOctagon } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import AnalyticsCard, { MetaChip } from "./AnalyticsCard";

interface Point {
  dispatch_id: string;
  incident_id: string;
  severity: string;
  type: string;
  travel_s: number;
  address: string;
}

const SEV_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};

export default function OutlierScatter({ points, span = 6 }: { points: Point[]; span?: number }) {
  const outliers = points.filter((p) => (p.severity === "critical" || p.severity === "high") && p.travel_s > 360);

  const data = points.map((p) => ({
    ...p,
    x: p.travel_s,
    y: SEV_RANK[p.severity] ?? 0,
    isOutlier: (p.severity === "critical" || p.severity === "high") && p.travel_s > 360,
  }));

  return (
    <AnalyticsCard
      title="Severity vs. Response Outliers"
      subtitle="Slow responses to high-severity calls flagged for review"
      icon={AlertOctagon}
      accent="#ef4444"
      span={span}
      trailing={<MetaChip accent={outliers.length > 0 ? "#ef4444" : "#22c55e"}>{outliers.length} outliers</MetaChip>}
      footer={<span>CPSE exception analysis · x = travel (s), y = severity</span>}
    >
      {points.length === 0 ? (
        <div className="flex items-center justify-center h-full text-[11px]" style={{ color: "#52525b" }}>
          No completed dispatches yet.
        </div>
      ) : (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 12, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f24" />
              <XAxis
                type="number"
                dataKey="x"
                name="travel"
                unit="s"
                tick={{ fill: "#52525b", fontSize: 9 }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="severity"
                domain={[0.5, 4.5]}
                ticks={[1, 2, 3, 4]}
                tick={{ fill: "#52525b", fontSize: 9 }}
                tickFormatter={(v) => (["", "low", "med", "high", "crit"])[v] ?? ""}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <ZAxis range={[60, 200]} />
              <ReferenceLine x={360} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: "6m", fontSize: 9, fill: "#ef4444", position: "top" }} />
              <ReferenceLine x={240} stroke="#eab308" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: "NFPA", fontSize: 9, fill: "#eab308", position: "top" }} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{ background: "#0a0a0e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, fontSize: 11 }}
                labelStyle={{ color: "#e4e4e7" }}
                formatter={(_value, _name, item) => {
                  const d = item?.payload as Point | undefined;
                  if (!d) return null;
                  return [`${d.type.replace(/_/g, " ")} · ${d.travel_s}s`, d.address.split(",")[0]];
                }}
              />
              <Scatter data={data} shape="circle">
                {data.map((p, i) => (
                  <Cell
                    key={i}
                    fill={SEV_COLOR[p.severity] ?? "#71717a"}
                    fillOpacity={p.isOutlier ? 0.95 : 0.55}
                    stroke={p.isOutlier ? "#fff" : "none"}
                    strokeWidth={p.isOutlier ? 1.2 : 0}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </AnalyticsCard>
  );
}
