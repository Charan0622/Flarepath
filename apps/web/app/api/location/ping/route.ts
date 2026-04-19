import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";

const PingSchema = z.object({
  dispatch_id: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  speed_kmh: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
});

// Also accept batched pings
const BatchPingSchema = z.object({
  pings: z.array(PingSchema).max(10),
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

// POST /api/location/ping — insert GPS ping(s)
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const body = await request.json();

  // Try batch first, then single
  const batch = BatchPingSchema.safeParse(body);
  const single = PingSchema.safeParse(body);

  const pings = batch.success ? batch.data.pings : single.success ? [single.data] : null;
  if (!pings) {
    return apiError("Invalid ping data", 400);
  }

  // Get vehicle_id from dispatch
  const dispatchId = pings[0].dispatch_id;
  const { data: dispatch } = await supabase
    .from("dispatches")
    .select("vehicle_id")
    .eq("id", dispatchId)
    .single();

  if (!dispatch) return apiError("Dispatch not found", 404);

  const rows = pings.map((p) => ({
    dispatch_id: p.dispatch_id,
    vehicle_id: dispatch.vehicle_id,
    location: `POINT(${p.longitude} ${p.latitude})`,
    speed_kmh: p.speed_kmh ?? null,
    heading: p.heading ?? null,
  }));

  const { error } = await supabase.from("location_pings").insert(rows);
  if (error) return apiError(error.message, 500);

  // Update vehicle current location
  const latest = pings[pings.length - 1];
  await supabase
    .from("vehicles")
    .update({ current_location: `POINT(${latest.longitude} ${latest.latitude})` })
    .eq("id", dispatch.vehicle_id);

  return apiSuccess({ inserted: rows.length });
}
