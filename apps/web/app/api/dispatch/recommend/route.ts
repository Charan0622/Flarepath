import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
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

// Haversine distance in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TYPE_PREFERENCES: Record<string, string[]> = {
  structure_fire: ["engine", "ladder"],
  vehicle_fire: ["engine", "tanker"],
  wildfire: ["engine", "tanker"],
  medical: ["ambulance", "rescue"],
  hazmat: ["engine", "rescue"],
  rescue: ["rescue", "engine"],
  false_alarm: ["engine"],
  other: ["engine"],
};

// GET /api/dispatch/recommend?incidentId=...
export async function GET(request: NextRequest) {
  const supabase = getSupabase();

  const incidentId = request.nextUrl.searchParams.get("incidentId");
  if (!incidentId) return apiError("incidentId is required", 400);

  // Get incident
  const { data: incident } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", incidentId)
    .single();

  if (!incident) return apiError("Incident not found", 404);

  // Get all available vehicles with their station info
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("*, stations!inner(name, address, location)")
    .eq("status", "available");

  if (!vehicles || vehicles.length === 0) {
    return apiSuccess({ recommendations: [], message: "No available vehicles" });
  }

  // Get station coordinates from seed data
  const stationCoords: Record<string, { lat: number; lng: number }> = {
    "SJFD Station 1": { lat: 37.3394, lng: -121.8900 },
    "SJFD Station 7": { lat: 37.3295, lng: -121.9148 },
    "SJFD Station 30": { lat: 37.3660, lng: -121.8350 },
  };

  // Incident coordinates from seed data lookup
  const incidentCoords = getIncidentCoords(incident.address);
  if (!incidentCoords) return apiError("Cannot determine incident location", 400);

  const preferredTypes = TYPE_PREFERENCES[incident.type] ?? ["engine"];

  // Score each vehicle
  const scored = vehicles.map((v: Record<string, unknown>) => {
    const station = v.stations as { name: string };
    const sCoords = stationCoords[station.name] ?? { lat: 37.3382, lng: -121.8863 };
    const distance = haversine(sCoords.lat, sCoords.lng, incidentCoords.lat, incidentCoords.lng);

    const typeMatch = preferredTypes.includes(v.type as string) ? 1.0 : 0.3;
    const distScore = Math.max(0, 1 - distance / 20); // Normalize to 20km max

    const score = 0.4 * distScore + 0.3 * typeMatch + 0.15 * 1.0 + 0.15 * 0.8;

    return {
      vehicle_id: v.id,
      call_sign: v.call_sign,
      type: v.type,
      capacity: v.capacity,
      station_name: station.name,
      distance_km: Math.round(distance * 10) / 10,
      eta_minutes: Math.round((distance / 40) * 60), // ~40 km/h average
      score: Math.round(score * 100) / 100,
      coordinates: sCoords,
    };
  });

  scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);

  return apiSuccess({ recommendations: scored });
}

function getIncidentCoords(address: string): { lat: number; lng: number } | null {
  const coords: Record<string, { lat: number; lng: number }> = {
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
  // Try exact match first, then partial
  if (coords[address]) return coords[address];
  for (const [key, val] of Object.entries(coords)) {
    if (address.includes(key.split(",")[0])) return val;
  }
  // Default to San Jose center
  return { lat: 37.3382, lng: -121.8863 };
}
