import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { apiSuccess } from "@/lib/api-response";

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} } },
  });
}

// GET /api/crew/performance — individual crew metrics
export async function GET() {
  const supabase = getSupabase();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, current_status, skills");

  const { data: dispatches } = await supabase
    .from("dispatches")
    .select("id, crew, status, assigned_at, acknowledged_at, on_scene_at, completed_at");

  const crewMetrics = (profiles ?? []).map((profile) => {
    // Find dispatches where this person was part of the crew
    const myDispatches = (dispatches ?? []).filter((d) =>
      (d.crew as string[])?.includes(profile.id)
    );

    const completedDispatches = myDispatches.filter((d) => d.status === "completed");

    // Avg acknowledgment time
    const ackTimes = myDispatches
      .filter((d) => d.acknowledged_at && d.assigned_at)
      .map((d) => (new Date(d.acknowledged_at).getTime() - new Date(d.assigned_at).getTime()) / 1000);

    const avgAckTime = ackTimes.length > 0 ? Math.round(ackTimes.reduce((a, b) => a + b, 0) / ackTimes.length) : null;

    // Avg response time (assigned → on_scene)
    const responseTimes = myDispatches
      .filter((d) => d.on_scene_at && d.assigned_at)
      .map((d) => (new Date(d.on_scene_at).getTime() - new Date(d.assigned_at).getTime()) / 1000);

    const avgResponseTime = responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null;

    return {
      id: profile.id,
      name: profile.full_name,
      role: profile.role,
      status: profile.current_status,
      skills: profile.skills,
      total_dispatches: myDispatches.length,
      completed_dispatches: completedDispatches.length,
      avg_ack_time_seconds: avgAckTime,
      avg_response_time_seconds: avgResponseTime,
    };
  });

  return apiSuccess(crewMetrics);
}
