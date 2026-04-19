import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, getServiceClient } from "@/lib/supabase/api";
import { apiSuccess, apiError } from "@/lib/api-response";

const CreateIncidentSchema = z.object({
  reporter_name: z.string().min(1).optional(),
  reporter_phone: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(1),
  type: z.enum(["structure_fire", "vehicle_fire", "wildfire", "medical", "hazmat", "rescue", "false_alarm", "other"]),
  description: z.string().min(1),
  hazards: z.array(z.string()).default([]),
});

const IncidentFilterSchema = z.object({
  status: z.enum(["open", "triaged", "dispatched", "on_scene", "resolved", "cancelled"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// POST /api/incidents
export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) return apiError("Unauthorized", 401);
  if (!["dispatcher", "admin", "chief"].includes(auth.profile.role)) {
    return apiError("Insufficient permissions", 403);
  }

  const body = await request.json();
  const parsed = CreateIncidentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  const { latitude, longitude, ...rest } = parsed.data;
  const db = getServiceClient();

  const { data: incident, error } = await db
    .from("incidents")
    .insert({
      organization_id: auth.profile.organization_id,
      location: `POINT(${longitude} ${latitude})`,
      created_by: auth.user.id,
      ...rest,
    })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return apiSuccess(incident, 201);
}

// GET /api/incidents
export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) return apiError("Unauthorized", 401);

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  const parsed = IncidentFilterSchema.safeParse(params);
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  const { status, severity, limit, offset } = parsed.data;
  const db = getServiceClient();

  let query = db
    .from("incidents")
    .select("*", { count: "exact" })
    .eq("organization_id", auth.profile.organization_id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (severity) query = query.eq("severity", severity);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500);

  return apiSuccess({ incidents: data, total: count });
}
