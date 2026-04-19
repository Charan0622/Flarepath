import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
}

// GET /api/analytics — aggregated metrics
export async function GET(_request: NextRequest) {
  const supabase = getSupabase();

  // Fetch all data in parallel
  const [incidentsRes, dispatchesRes, vehiclesRes] = await Promise.all([
    supabase.from("incidents").select("id, type, severity, status, created_at"),
    supabase.from("dispatches").select("id, status, assigned_at, on_scene_at, completed_at, vehicle_id"),
    supabase.from("vehicles").select("id, call_sign, type, status"),
  ]);

  const incidents = incidentsRes.data ?? [];
  const dispatches = dispatchesRes.data ?? [];
  const vehicles = vehiclesRes.data ?? [];

  // Incident counts by status
  const statusCounts: Record<string, number> = {};
  incidents.forEach((i) => {
    statusCounts[i.status] = (statusCounts[i.status] ?? 0) + 1;
  });

  // Incident counts by type
  const typeCounts: Record<string, number> = {};
  incidents.forEach((i) => {
    typeCounts[i.type] = (typeCounts[i.type] ?? 0) + 1;
  });

  // Severity distribution
  const severityCounts: Record<string, number> = {};
  incidents.forEach((i) => {
    severityCounts[i.severity] = (severityCounts[i.severity] ?? 0) + 1;
  });

  // Response times (assigned → on_scene)
  const responseTimes = dispatches
    .filter((d) => d.on_scene_at && d.assigned_at)
    .map((d) => {
      const assigned = new Date(d.assigned_at).getTime();
      const onScene = new Date(d.on_scene_at).getTime();
      return Math.round((onScene - assigned) / 1000);
    });

  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null;

  // Vehicle utilization
  const availableCount = vehicles.filter((v) => v.status === "available").length;
  const dispatchedCount = vehicles.filter((v) => v.status === "dispatched").length;

  // Incidents per day (last 30 days)
  const dailyCounts: Record<string, number> = {};
  incidents.forEach((i) => {
    const day = new Date(i.created_at).toISOString().split("T")[0];
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;
  });

  const incidentsPerDay = Object.entries(dailyCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return apiSuccess({
    summary: {
      total_incidents: incidents.length,
      active_incidents: incidents.filter((i) => !["resolved", "cancelled"].includes(i.status)).length,
      total_dispatches: dispatches.length,
      avg_response_time_seconds: avgResponseTime,
      vehicles_available: availableCount,
      vehicles_dispatched: dispatchedCount,
    },
    charts: {
      by_status: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
      by_type: Object.entries(typeCounts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })),
      by_severity: Object.entries(severityCounts).map(([name, value]) => ({ name, value })),
      incidents_per_day: incidentsPerDay,
      response_times: responseTimes,
    },
  });
}
