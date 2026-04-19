import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";

const CreateDispatchSchema = z.object({
  incident_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  route_geojson: z.unknown().optional(),
  distance_m: z.number().optional(),
  eta_seconds: z.number().optional(),
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

// POST /api/dispatch — create a dispatch (assign vehicle to incident)
export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  const body = await request.json();
  const parsed = CreateDispatchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  const { incident_id, vehicle_id, route_geojson, distance_m, eta_seconds } = parsed.data;

  // Create dispatch
  const { data: dispatch, error } = await supabase
    .from("dispatches")
    .insert({
      incident_id,
      vehicle_id,
      route_geojson,
      distance_m,
      eta_seconds,
    })
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  // Update vehicle status to dispatched
  await supabase
    .from("vehicles")
    .update({ status: "dispatched" })
    .eq("id", vehicle_id);

  // Update incident status to dispatched
  await supabase
    .from("incidents")
    .update({ status: "dispatched" })
    .eq("id", incident_id)
    .in("status", ["open", "triaged"]);

  return apiSuccess(dispatch, 201);
}
