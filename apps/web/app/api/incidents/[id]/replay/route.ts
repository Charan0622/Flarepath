import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} } },
  });
}

// GET /api/incidents/:id/replay — timeline data for historical replay
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabase();

  const [incidentRes, dispatchRes, pingsRes, messagesRes, triageRes] = await Promise.all([
    supabase.from("incidents").select("*").eq("id", params.id).single(),
    supabase.from("dispatches").select("*").eq("incident_id", params.id).order("assigned_at"),
    supabase.from("location_pings").select("*").eq("dispatch_id", params.id).order("recorded_at"),
    supabase.from("incident_messages").select("*, profiles(full_name)").eq("incident_id", params.id).order("created_at"),
    supabase.from("ai_triage").select("*").eq("incident_id", params.id).maybeSingle(),
  ]);

  if (!incidentRes.data) return apiError("Incident not found", 404);

  // Build timeline events
  const events: { time: string; type: string; detail: string }[] = [];

  events.push({ time: incidentRes.data.created_at, type: "created", detail: `Incident reported: ${incidentRes.data.type}` });

  if (triageRes.data) {
    events.push({ time: triageRes.data.created_at, type: "triage", detail: `AI triage: ${triageRes.data.predicted_severity} severity (${Math.round(triageRes.data.confidence * 100)}% confidence)` });
  }

  (dispatchRes.data ?? []).forEach((d) => {
    events.push({ time: d.assigned_at, type: "dispatch", detail: `Vehicle dispatched` });
    if (d.acknowledged_at) events.push({ time: d.acknowledged_at, type: "ack", detail: "Dispatch acknowledged" });
    if (d.en_route_at) events.push({ time: d.en_route_at, type: "en_route", detail: "En route to incident" });
    if (d.on_scene_at) events.push({ time: d.on_scene_at, type: "on_scene", detail: "On scene" });
    if (d.completed_at) events.push({ time: d.completed_at, type: "completed", detail: "Dispatch completed" });
  });

  (messagesRes.data ?? []).forEach((m) => {
    events.push({ time: m.created_at, type: "message", detail: `${(m.profiles as { full_name: string })?.full_name}: ${m.message}` });
  });

  events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return apiSuccess({
    incident: incidentRes.data,
    dispatches: dispatchRes.data ?? [],
    pings: pingsRes.data ?? [],
    timeline: events,
  });
}
