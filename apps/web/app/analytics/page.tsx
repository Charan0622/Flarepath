"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity, Clock, Truck, Flame, Download, AlertTriangle,
  CheckCircle2, RefreshCw,
} from "lucide-react";
import NavRail from "@/components/NavRail";
import BrandMark from "@/components/BrandMark";

import NFPAGauge from "@/components/analytics/NFPAGauge";
import ResponseDistribution from "@/components/analytics/ResponseDistribution";
import StressMeter from "@/components/analytics/StressMeter";
import IncidentForecast from "@/components/analytics/IncidentForecast";
import TurnoutLeaderboard from "@/components/analytics/TurnoutLeaderboard";
import TriageConfidence from "@/components/analytics/TriageConfidence";
import UHUHeatmap from "@/components/analytics/UHUHeatmap";
import OutlierScatter from "@/components/analytics/OutlierScatter";
import NFIRSBenchmark from "@/components/analytics/NFIRSBenchmark";
import RouteEfficiency from "@/components/analytics/RouteEfficiency";
import UnitStatusBoard from "@/components/analytics/UnitStatusBoard";
import HotspotHeatmap from "@/components/analytics/HotspotHeatmap";
import CoverageIsochrones from "@/components/analytics/CoverageIsochrones";
import ResponseFlowMap from "@/components/analytics/ResponseFlowMap";
import AIInsightsFeed from "@/components/analytics/AIInsightsFeed";

interface AnalyticsPayload {
  summary: {
    total_incidents: number; active_incidents: number; resolved_incidents: number; critical_incidents: number;
    total_dispatches: number; active_dispatches: number;
    avg_response_time_seconds: number | null;
    vehicles_total: number; vehicles_available: number; vehicles_dispatched: number; vehicles_maintenance: number;
    generated_at: string;
  };
  charts: {
    by_status: { name: string; value: number }[];
    by_type: { name: string; value: number }[];
    by_severity: { name: string; value: number }[];
  };
  nfpa: Parameters<typeof NFPAGauge>[0]["nfpa"];
  distribution: Parameters<typeof ResponseDistribution>[0]["distribution"];
  hotspots: Parameters<typeof HotspotHeatmap>[0]["hotspots"];
  flows: Parameters<typeof ResponseFlowMap>[0]["flows"];
  stations: Parameters<typeof CoverageIsochrones>[0]["stations"];
  turnoutLeaderboard: Parameters<typeof TurnoutLeaderboard>[0]["rows"];
  triage: Parameters<typeof TriageConfidence>[0]["triage"];
  uhu: Parameters<typeof UHUHeatmap>[0]["uhu"];
  forecast: { history: Parameters<typeof IncidentForecast>[0]["history"]; forecast: Parameters<typeof IncidentForecast>[0]["forecast"] };
  stress: Parameters<typeof StressMeter>[0]["stress"];
  unitBoard: Parameters<typeof UnitStatusBoard>[0]["units"];
  eta: Parameters<typeof RouteEfficiency>[0]["eta"];
  scatter: Parameters<typeof OutlierScatter>[0]["points"];
  insights: Parameters<typeof AIInsightsFeed>[0]["insights"];
}

async function fetchAnalytics(): Promise<AnalyticsPayload> {
  const res = await fetch("/api/analytics");
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data as AnalyticsPayload;
}

function fmtDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  function exportCSV() {
    if (!data) return;
    const s = data.summary;
    const rows: (string | number)[][] = [
      ["metric", "value"],
      ["total_incidents", s.total_incidents],
      ["active_incidents", s.active_incidents],
      ["resolved_incidents", s.resolved_incidents],
      ["critical_incidents", s.critical_incidents],
      ["total_dispatches", s.total_dispatches],
      ["active_dispatches", s.active_dispatches],
      ["median_response_s", s.avg_response_time_seconds ?? ""],
      ["nfpa_total_p90", data.nfpa.total.p90 ?? ""],
      ["nfpa_turnout_p90", data.nfpa.turnout.p90 ?? ""],
      ["nfpa_travel_p90", data.nfpa.travel.p90 ?? ""],
      ["vehicles_total", s.vehicles_total],
      ["vehicles_available", s.vehicles_available],
      ["vehicles_dispatched", s.vehicles_dispatched],
      ["vehicles_maintenance", s.vehicles_maintenance],
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flarepath-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="h-screen w-screen overflow-hidden grid"
      style={{
        gridTemplateRows: "52px 1fr",
        gridTemplateColumns: "56px 1fr",
      }}
    >
      <div className="row-span-2"><NavRail /></div>

      <header className="flex items-center justify-between px-5 glass-strip glass-divider-b">
        <BrandMark showWord hideMark subtitle="Operational Intelligence" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="glass-card flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] transition-colors disabled:opacity-50"
            style={{ color: "#a1a1aa" }}
          >
            <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            disabled={!data}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:brightness-110 hover:shadow-[0_0_16px_rgba(59,130,246,0.35)] disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
          >
            <Download size={11} />
            Export CSV
          </button>
        </div>
      </header>

      <main className="overflow-auto p-5">
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message={(error as Error)?.message ?? "Failed to load analytics"} onRetry={() => refetch()} />
        ) : !data || data.summary.total_incidents === 0 ? (
          <EmptyState />
        ) : (
          <div className="max-w-[1600px] mx-auto space-y-4">
            {/* KPI strip */}
            <div className="grid grid-cols-5 gap-3">
              <KPIStrip icon={Flame} label="Incidents" value={data.summary.total_incidents} sub={`${data.summary.active_incidents} active · ${data.summary.critical_incidents} critical`} accent="#ef4444" />
              <KPIStrip icon={Activity} label="Dispatches" value={data.summary.total_dispatches} sub={`${data.summary.active_dispatches} now`} accent="#f97316" />
              <KPIStrip icon={Clock} label="Median response" value={fmtDuration(data.summary.avg_response_time_seconds)} sub="NFPA-tracked" accent="#eab308" />
              <KPIStrip icon={Truck} label="Fleet" value={data.summary.vehicles_total > 0 ? `${data.summary.vehicles_available}/${data.summary.vehicles_total}` : "—"} sub={`${data.summary.vehicles_dispatched} dispatched`} accent="#22c55e" />
              <KPIStrip icon={CheckCircle2} label="Resolved" value={data.summary.resolved_incidents} sub={data.summary.total_incidents > 0 ? `${Math.round((data.summary.resolved_incidents / data.summary.total_incidents) * 100)}% rate` : ""} accent="#3b82f6" />
            </div>

            {/* Row 1 — NFPA hero + system pressure + ETA gauges */}
            <div className="grid grid-cols-12 gap-4 auto-rows-min">
              <NFPAGauge nfpa={data.nfpa} span={6} />
              <StressMeter stress={data.stress} span={3} />
              <RouteEfficiency eta={data.eta} span={3} />

              {/* Row 2 — Hotspot heatmap + 4-hour forecast */}
              <HotspotHeatmap hotspots={data.hotspots} span={8} />
              <IncidentForecast history={data.forecast.history} forecast={data.forecast.forecast} span={4} />

              {/* Row 3 — Coverage isochrones + live unit board */}
              <CoverageIsochrones stations={data.stations} incidents={data.hotspots} span={6} />
              <UnitStatusBoard units={data.unitBoard} span={6} />

              {/* Row 4 — Flow map + turnout leaderboard */}
              <ResponseFlowMap flows={data.flows} span={8} />
              <TurnoutLeaderboard rows={data.turnoutLeaderboard} span={4} />

              {/* Row 5 — Outlier scatter + UHU heatmap */}
              <OutlierScatter points={data.scatter} span={6} />
              <UHUHeatmap uhu={data.uhu} span={6} />

              {/* Row 6 — triage confidence + NFIRS benchmark + response distribution */}
              <TriageConfidence triage={data.triage} span={4} />
              <NFIRSBenchmark byType={data.charts.by_type} span={4} />
              <ResponseDistribution distribution={data.distribution} nfpa={data.nfpa} span={4} />

              {/* Row 7 — AI insights feed (full width) */}
              <AIInsightsFeed insights={data.insights} span={12} />
            </div>

            <footer className="text-[10px] text-center py-4" style={{ color: "#52525b" }}>
              Last generated {new Date(data.summary.generated_at).toLocaleTimeString()} · NFPA 1710 targets: 60s call processing · 80s turnout · 240s travel · 390s total (all at 90th percentile)
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}

function KPIStrip({
  icon: Icon, label, value, sub, accent,
}: { icon: typeof Activity; label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="glass-card rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: "#71717a" }}>
          <Icon size={11} style={{ color: accent }} />
          <span>{label}</span>
        </div>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
      </div>
      <p className="mt-1.5 text-[20px] font-bold text-white tabular-nums leading-tight">{value}</p>
      {sub && <p className="mt-0.5 text-[10px]" style={{ color: "#71717a" }}>{sub}</p>}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      <div className="grid grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg h-20 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
        ))}
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6 rounded-lg h-60 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
        <div className="col-span-3 rounded-lg h-60 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
        <div className="col-span-3 rounded-lg h-60 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
        <div className="col-span-8 rounded-lg h-80 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
        <div className="col-span-4 rounded-lg h-80 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="max-w-md mx-auto mt-24 text-center">
      <div className="inline-flex w-12 h-12 rounded-full items-center justify-center mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
        <AlertTriangle size={20} style={{ color: "#ef4444" }} />
      </div>
      <h2 className="text-[14px] font-semibold text-white mb-1">Couldn&apos;t load analytics</h2>
      <p className="text-[11px]" style={{ color: "#a1a1aa" }}>{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-md px-4 py-1.5 text-[11px] font-semibold text-white" style={{ background: "#ef4444" }}>
        Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="max-w-md mx-auto mt-24 text-center">
      <div className="inline-flex w-12 h-12 rounded-full items-center justify-center mb-4" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)" }}>
        <CheckCircle2 size={20} style={{ color: "#3b82f6" }} />
      </div>
      <h2 className="text-[14px] font-semibold text-white mb-1">No incidents yet</h2>
      <p className="text-[11px]" style={{ color: "#a1a1aa" }}>
        Analytics populate once dispatchers start logging incidents. Create one from the Dispatch page to see the dashboard fill in.
      </p>
    </div>
  );
}
