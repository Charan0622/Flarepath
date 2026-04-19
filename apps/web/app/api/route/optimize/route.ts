import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";

const RouteRequestSchema = z.object({
  origin_lng: z.number(),
  origin_lat: z.number(),
  dest_lng: z.number(),
  dest_lat: z.number(),
});

// Simple in-memory cache (5 min TTL)
const routeCache = new Map<string, { data: unknown; expires: number }>();

// GET /api/route/optimize — compute route via Mapbox Directions
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = RouteRequestSchema.safeParse({
    origin_lng: Number(params.origin_lng),
    origin_lat: Number(params.origin_lat),
    dest_lng: Number(params.dest_lng),
    dest_lat: Number(params.dest_lat),
  });

  if (!parsed.success) {
    return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  const { origin_lng, origin_lat, dest_lng, dest_lat } = parsed.data;
  const cacheKey = `${origin_lng},${origin_lat}-${dest_lng},${dest_lat}`;

  // Check cache
  const cached = routeCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return apiSuccess(cached.data);
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
    `${origin_lng},${origin_lat};${dest_lng},${dest_lat}` +
    `?steps=true&voice_instructions=true&banner_instructions=true` +
    `&overview=full&geometries=geojson&access_token=${token}`;

  const res = await fetch(url);
  if (!res.ok) {
    return apiError(`Mapbox API error: ${res.status}`, 502);
  }

  const data = await res.json();
  const route = data.routes?.[0];

  if (!route) {
    return apiError("No route found", 404);
  }

  const result = {
    distance_m: Math.round(route.distance),
    duration_s: Math.round(route.duration),
    geometry: route.geometry,
    steps: route.legs?.[0]?.steps?.map((step: Record<string, unknown>) => ({
      instruction: (step.maneuver as Record<string, unknown>)?.instruction,
      distance: step.distance,
      duration: step.duration,
      maneuver: step.maneuver,
    })) ?? [],
  };

  // Cache for 5 minutes
  routeCache.set(cacheKey, { data: result, expires: Date.now() + 5 * 60 * 1000 });

  return apiSuccess(result);
}
