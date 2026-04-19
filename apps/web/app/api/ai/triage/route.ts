import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";
import { triageWithGemini } from "@/lib/ai/triage";
import { apiSuccess, apiError } from "@/lib/api-response";

const TriageRequestSchema = z.object({
  incident_id: z.string().uuid(),
});

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

// POST /api/ai/triage — run AI triage on an incident
export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  const body = await request.json();
  const parsed = TriageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  // Fetch the incident
  const { data: incident, error: fetchError } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", parsed.data.incident_id)
    .single();

  if (fetchError || !incident) return apiError("Incident not found", 404);

  // Run triage
  const { output, latency_ms, model, prompt_hash } = await triageWithGemini(
    incident.description ?? "",
    incident.address,
    incident.type,
    incident.hazards ?? []
  );

  // Store triage result
  const { data: triage, error: insertError } = await supabase
    .from("ai_triage")
    .upsert({
      incident_id: incident.id,
      predicted_type: output.predicted_type,
      predicted_severity: output.predicted_severity,
      confidence: output.confidence,
      extracted_entities: output.extracted_entities,
      recommended_vehicles: output.recommended_vehicle_types,
      recommended_crew_size: output.recommended_crew_size,
      reasoning: output.reasoning,
      model,
      prompt_hash,
      latency_ms,
    })
    .select()
    .single();

  if (insertError) return apiError(insertError.message, 500);

  // Update incident severity + status based on AI output
  await supabase
    .from("incidents")
    .update({
      severity: output.predicted_severity,
      status: incident.status === "open" ? "triaged" : incident.status,
    })
    .eq("id", incident.id);

  return apiSuccess(triage, 201);
}
