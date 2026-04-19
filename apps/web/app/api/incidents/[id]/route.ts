import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";

const UpdateIncidentSchema = z.object({
  status: z.enum(["open", "triaged", "dispatched", "on_scene", "resolved", "cancelled"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  description: z.string().min(1).optional(),
  hazards: z.array(z.string()).optional(),
});

const INCIDENT_TRANSITIONS: Record<string, string[]> = {
  open: ["triaged", "cancelled"],
  triaged: ["dispatched", "cancelled"],
  dispatched: ["on_scene", "cancelled"],
  on_scene: ["resolved"],
  resolved: [],
  cancelled: [],
};

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

// GET /api/incidents/:id — detail with triage + dispatches
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data: incident, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !incident) return apiError("Incident not found", 404);

  // Fetch triage and dispatches in parallel
  const [triageResult, dispatchResult] = await Promise.all([
    supabase.from("ai_triage").select("*").eq("incident_id", params.id).maybeSingle(),
    supabase.from("dispatches").select("*").eq("incident_id", params.id),
  ]);

  return apiSuccess({
    ...incident,
    triage: triageResult.data,
    dispatches: dispatchResult.data ?? [],
  });
}

// PATCH /api/incidents/:id — update with state machine enforcement
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await request.json();
  const parsed = UpdateIncidentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  // If status change, enforce state machine
  if (parsed.data.status) {
    const { data: current } = await supabase
      .from("incidents")
      .select("status")
      .eq("id", params.id)
      .single();

    if (!current) return apiError("Incident not found", 404);

    const allowed = INCIDENT_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      return apiError(
        `Invalid transition: ${current.status} → ${parsed.data.status}. Allowed: ${allowed.join(", ") || "none"}`,
        409
      );
    }
  }

  const { data: updated, error } = await supabase
    .from("incidents")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  return apiSuccess(updated);
}
