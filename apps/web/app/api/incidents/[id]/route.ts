import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, getServiceClient } from "@/lib/supabase/api";
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

// GET /api/incidents/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) return apiError("Unauthorized", 401);

  const db = getServiceClient();

  const { data: incident, error } = await db
    .from("incidents")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !incident) return apiError("Incident not found", 404);

  const [triageResult, dispatchResult] = await Promise.all([
    db.from("ai_triage").select("*").eq("incident_id", params.id).maybeSingle(),
    db.from("dispatches").select("*").eq("incident_id", params.id),
  ]);

  return apiSuccess({
    ...incident,
    triage: triageResult.data,
    dispatches: dispatchResult.data ?? [],
  });
}

// PATCH /api/incidents/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthenticatedUser();
  if (!auth) return apiError("Unauthorized", 401);

  const body = await request.json();
  const parsed = UpdateIncidentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  const db = getServiceClient();

  if (parsed.data.status) {
    const { data: current } = await db
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

  const { data: updated, error } = await db
    .from("incidents")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiSuccess(updated);
}
