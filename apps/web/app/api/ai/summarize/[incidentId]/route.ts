import "server-only";

import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateIncidentSummary } from "@/lib/ai/summarize";
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

// POST /api/ai/summarize/:incidentId — generate post-incident AI summary
export async function POST(
  _request: NextRequest,
  { params }: { params: { incidentId: string } }
) {
  const supabase = getSupabase();

  const { data: incident } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", params.incidentId)
    .single();

  if (!incident) return apiError("Incident not found", 404);

  // Get dispatches for response time calculation
  const { data: dispatches } = await supabase
    .from("dispatches")
    .select("*")
    .eq("incident_id", params.incidentId);

  const summary = await generateIncidentSummary(incident);

  // Calculate response time from first dispatch
  let responseTimeSeconds: number | null = null;
  if (dispatches?.length && dispatches[0].on_scene_at) {
    const assigned = new Date(dispatches[0].assigned_at).getTime();
    const onScene = new Date(dispatches[0].on_scene_at).getTime();
    responseTimeSeconds = Math.round((onScene - assigned) / 1000);
  }

  // Upsert report
  const { data: report, error } = await supabase
    .from("incident_reports")
    .upsert({
      incident_id: params.incidentId,
      ai_summary: summary.summary,
      cause: summary.cause ?? null,
      response_time_seconds: responseTimeSeconds,
      units_involved: dispatches?.length ?? 0,
    }, { onConflict: "incident_id" })
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  return apiSuccess({
    report,
    analysis: summary,
  });
}
