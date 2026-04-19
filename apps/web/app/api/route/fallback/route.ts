import { NextRequest } from "next/server";
import { z } from "zod";
import { aStar, buildSimpleGraph } from "../../../../../../../../packages/core/src/domain/routing/astar";
import { apiSuccess, apiError } from "@/lib/api-response";

const RouteRequestSchema = z.object({
  origin_lng: z.number(),
  origin_lat: z.number(),
  dest_lng: z.number(),
  dest_lat: z.number(),
});

// San Jose road network sample nodes (simplified for demo)
const DEMO_NODES = [
  { id: "n1", lat: 37.3394, lng: -121.8900 },  // Station 1
  { id: "n2", lat: 37.3350, lng: -121.8850 },  // Downtown
  { id: "n3", lat: 37.3295, lng: -121.9148 },  // Station 7
  { id: "n4", lat: 37.3660, lng: -121.8350 },  // Station 30
  { id: "n5", lat: 37.3335, lng: -121.8850 },  // S 4th St
  { id: "n6", lat: 37.3340, lng: -121.8890 },  // S 1st St
  { id: "n7", lat: 37.3430, lng: -121.9070 },  // The Alameda
  { id: "n8", lat: 37.3210, lng: -121.9478 },  // Santana Row
  { id: "n9", lat: 37.3862, lng: -121.8230 },  // Alum Rock
  { id: "n10", lat: 37.3318, lng: -121.8916 }, // Park Ave
  { id: "n11", lat: 37.3080, lng: -121.8990 }, // Willow Glen
  { id: "n12", lat: 37.4072, lng: -121.9230 }, // Zanker Rd
  { id: "n13", lat: 37.3246, lng: -121.9452 }, // Stevens Creek
  { id: "n14", lat: 37.3382, lng: -121.8863 }, // City center
];

// GET /api/route/fallback — A* offline routing fallback
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

  // Add origin and destination as temporary nodes
  const nodes = [
    ...DEMO_NODES,
    { id: "origin", lat: origin_lat, lng: origin_lng },
    { id: "dest", lat: dest_lat, lng: dest_lng },
  ];

  const graph = buildSimpleGraph(nodes, 5);
  const result = aStar(graph, "origin", "dest");

  if (!result) {
    return apiError("No route found", 404);
  }

  return apiSuccess({
    distance_m: Math.round(result.total_distance),
    duration_s: Math.round(result.total_time),
    geometry: {
      type: "LineString",
      coordinates: result.coordinates,
    },
    engine: "astar-fallback",
    steps: [],
  });
}
