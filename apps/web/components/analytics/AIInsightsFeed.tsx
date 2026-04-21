"use client";

import { Sparkles, Clock, Users, FileText } from "lucide-react";
import AnalyticsCard, { MetaChip } from "./AnalyticsCard";

interface Insight {
  id: string;
  incident_id: string;
  summary: string;
  cause: string | null;
  response_time_seconds: number | null;
  units_involved: number | null;
  severity: string;
  type: string;
  address: string;
  created_at: string;
  coords: [number, number] | null;
}

const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};

// Crude tag extractor: surfaces distinctive short phrases from the summary
function extractTags(summary: string): string[] {
  const patterns: Array<[RegExp, string]> = [
    [/delayed water supply|water supply delay/i, "water supply delay"],
    [/access issue|access problem|restricted access/i, "access issue"],
    [/mutual aid/i, "mutual aid"],
    [/false alarm/i, "false alarm"],
    [/trapped occupant|rescue/i, "rescue op"],
    [/gas leak|hazmat/i, "hazmat"],
    [/traffic|blocked lane/i, "traffic hazard"],
    [/structural collapse/i, "structural risk"],
    [/chemical fume/i, "chemical fumes"],
    [/wind.driven|wildland/i, "wind-driven"],
  ];
  const out: string[] = [];
  patterns.forEach(([re, tag]) => { if (re.test(summary) && !out.includes(tag)) out.push(tag); });
  return out.slice(0, 4);
}

function fmt(s: number | null): string {
  if (s === null) return "—";
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function InsightCard({ insight }: { insight: Insight }) {
  const color = SEV_COLOR[insight.severity] ?? "#71717a";
  const tags = extractTags(insight.summary);
  return (
    <article
      className="glass-card rounded-lg p-3 flex flex-col gap-2 cursor-default shrink-0 snap-start"
      style={{ width: 340, borderLeft: `3px solid ${color}` }}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-white capitalize truncate">
              {insight.type.replace(/_/g, " ")}
            </span>
            <span className="text-[8px] px-1 py-0.5 rounded uppercase tracking-wider" style={{ background: `${color}20`, color }}>
              {insight.severity}
            </span>
          </div>
          <div className="text-[10px] mt-0.5 truncate" style={{ color: "#a1a1aa" }}>
            {insight.address.split(",")[0]}
          </div>
        </div>
        <span className="text-[9px] tabular-nums shrink-0" style={{ color: "#52525b" }}>
          {timeAgo(insight.created_at)}
        </span>
      </header>

      <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: "#d4d4d8" }}>
        {insight.summary || "—"}
      </p>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.14)", color: "#c4b5fd" }}>
              #{t}
            </span>
          ))}
        </div>
      )}

      <footer className="flex items-center gap-3 text-[9px] mt-auto pt-1" style={{ color: "#71717a", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {insight.response_time_seconds !== null && (
          <span className="flex items-center gap-1"><Clock size={9} />{fmt(insight.response_time_seconds)}</span>
        )}
        {insight.units_involved !== null && (
          <span className="flex items-center gap-1"><Users size={9} />{insight.units_involved} units</span>
        )}
        {insight.cause && (
          <span className="flex items-center gap-1 truncate"><FileText size={9} />{insight.cause}</span>
        )}
      </footer>
    </article>
  );
}

export default function AIInsightsFeed({ insights, span = 12 }: { insights: Insight[]; span?: number }) {
  return (
    <AnalyticsCard
      title="AI Post-Incident Insights"
      subtitle="Gemini-generated summaries with auto-extracted operational tags"
      icon={Sparkles}
      accent="#a855f7"
      span={span}
      trailing={<MetaChip accent="#a855f7">{insights.length} reports</MetaChip>}
      footer={<span>Scroll horizontally · click an incident tag to filter (coming soon)</span>}
    >
      {insights.length === 0 ? (
        <div className="flex items-center justify-center h-full text-[11px]" style={{ color: "#52525b" }}>
          No post-incident reports generated yet. Resolve an incident on the dispatch page to populate this feed.
        </div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto snap-x pb-1"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {insights.map((i) => <InsightCard key={i.id} insight={i} />)}
        </div>
      )}
    </AnalyticsCard>
  );
}
