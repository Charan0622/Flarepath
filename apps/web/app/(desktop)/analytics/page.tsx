"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Activity, Clock, Truck, Flame, Download } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff2d2d", high: "#ff7b1c", medium: "#ffc93c", low: "#3ddc84",
};
const TYPE_COLORS = ["#ff2d2d", "#ff7b1c", "#ffc93c", "#3ddc84", "#3b82f6", "#8b5cf6", "#888", "#555"];

async function fetchAnalytics() {
  const res = await fetch("/api/analytics");
  return (await res.json()).data;
}

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Activity; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-[#1a1a1e] bg-[#121214] p-4">
      <div className="flex items-center gap-2 text-[#888]">
        <Icon size={16} />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#555]">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
  });

  function exportCSV() {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Incidents", data.summary.total_incidents],
      ["Active Incidents", data.summary.active_incidents],
      ["Total Dispatches", data.summary.total_dispatches],
      ["Avg Response Time (s)", data.summary.avg_response_time_seconds ?? "N/A"],
      ["Vehicles Available", data.summary.vehicles_available],
      ["Vehicles Dispatched", data.summary.vehicles_dispatched],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flarepath-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ff2d2d] border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, charts } = data;

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Analytics Dashboard</h1>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-md border border-[#333] px-3 py-1.5 text-xs text-[#888] hover:text-white transition-colors"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Flame} label="Total Incidents" value={summary.total_incidents} sub={`${summary.active_incidents} active`} />
        <StatCard icon={Activity} label="Dispatches" value={summary.total_dispatches} />
        <StatCard icon={Clock} label="Avg Response" value={summary.avg_response_time_seconds ? `${Math.round(summary.avg_response_time_seconds / 60)}m ${summary.avg_response_time_seconds % 60}s` : "N/A"} />
        <StatCard icon={Truck} label="Fleet" value={`${summary.vehicles_available}/${summary.vehicles_available + summary.vehicles_dispatched}`} sub={`${summary.vehicles_dispatched} dispatched`} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Incidents by Type */}
        <div className="rounded-lg border border-[#1a1a1e] bg-[#121214] p-4">
          <h3 className="mb-4 text-sm font-semibold text-[#888]">Incidents by Type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={charts.by_type}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1e" />
              <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: "#888", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#121214", border: "1px solid #1a1a1e", borderRadius: 8 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {charts.by_type.map((_: unknown, i: number) => (
                  <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Severity Distribution */}
        <div className="rounded-lg border border-[#1a1a1e] bg-[#121214] p-4">
          <h3 className="mb-4 text-sm font-semibold text-[#888]">Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={charts.by_severity} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {charts.by_severity.map((entry: { name: string }, i: number) => (
                  <Cell key={i} fill={SEVERITY_COLORS[entry.name] ?? "#888"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#121214", border: "1px solid #1a1a1e", borderRadius: 8 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="rounded-lg border border-[#1a1a1e] bg-[#121214] p-4">
        <h3 className="mb-4 text-sm font-semibold text-[#888]">Incidents Over Time</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={charts.incidents_per_day}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1e" />
            <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 10 }} />
            <YAxis tick={{ fill: "#888", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#121214", border: "1px solid #1a1a1e", borderRadius: 8 }} />
            <Line type="monotone" dataKey="count" stroke="#ff2d2d" strokeWidth={2} dot={{ fill: "#ff2d2d", r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
