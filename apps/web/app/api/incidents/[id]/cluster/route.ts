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

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/incidents/:id/cluster — find nearby incidents that may be duplicates
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabase();

  const { data: incident } = await supabase.from("incidents").select("*").eq("id", params.id).single();
  if (!incident) return apiError("Incident not found", 404);

  const { data: active } = await supabase
    .from("incidents")
    .select("*")
    .in("status", ["open", "triaged", "dispatched"])
    .neq("id", params.id);

  // Use seed coordinates lookup
  const incidentCoords = COORDS[incident.address];
  if (!incidentCoords) return apiSuccess({ nearby: [], message: "Cannot determine location" });

  const nearby = (active ?? [])
    .map((other) => {
      const otherCoords = COORDS[other.address];
      if (!otherCoords) return null;
      const distance = haversine(incidentCoords.lat, incidentCoords.lng, otherCoords.lat, otherCoords.lng);
      return distance < 500 ? { ...other, distance_m: Math.round(distance) } : null; // 500m threshold
    })
    .filter(Boolean);

  return apiSuccess({ nearby, threshold_m: 500 });
}

const COORDS: Record<string, { lat: number; lng: number }> = {
  "201 S 4th St, San Jose, CA 95112": { lat: 37.3335, lng: -121.8850 },
  "70 S 1st St, San Jose, CA 95113": { lat: 37.3340, lng: -121.8890 },
  "I-280 at 7th St, San Jose, CA 95112": { lat: 37.3350, lng: -121.8770 },
  "345 Park Ave, San Jose, CA 95110": { lat: 37.3318, lng: -121.8916 },
  "Alum Rock Park, San Jose, CA 95127": { lat: 37.3862, lng: -121.8230 },
  "1073 The Alameda, San Jose, CA 95126": { lat: 37.3430, lng: -121.9070 },
  "377 Santana Row, San Jose, CA 95128": { lat: 37.3210, lng: -121.9478 },
  "Lincoln Ave & Minnesota Ave, San Jose, CA 95125": { lat: 37.3080, lng: -121.8990 },
  "2855 Stevens Creek Blvd, San Jose, CA 95050": { lat: 37.3246, lng: -121.9452 },
  "3250 Zanker Rd, San Jose, CA 95134": { lat: 37.4072, lng: -121.9230 },
};
