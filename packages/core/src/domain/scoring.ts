/**
 * Resource recommendation scoring.
 *
 * Score = w1 * (1 / distance_km)
 *       + w2 * skill_match_ratio
 *       + w3 * availability_bonus
 *       + w4 * (1 / station_load)
 *
 * Higher score = better candidate.
 */

interface VehicleCandidate {
  id: string;
  call_sign: string;
  type: string;
  capacity: number;
  status: string;
  distance_km: number;
  station_vehicle_count: number;
  station_dispatched_count: number;
}

interface ScoredVehicle extends VehicleCandidate {
  score: number;
  breakdown: {
    distance_score: number;
    type_match_score: number;
    availability_score: number;
    load_score: number;
  };
}

const WEIGHTS = {
  distance: 0.4,
  type_match: 0.3,
  availability: 0.15,
  load: 0.15,
};

// Which vehicle types are best for each incident type
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

export function scoreVehicles(
  candidates: VehicleCandidate[],
  incidentType: string
): ScoredVehicle[] {
  const preferredTypes = TYPE_PREFERENCES[incidentType] ?? ["engine"];
  const maxDistance = Math.max(...candidates.map((c) => c.distance_km), 1);

  return candidates
    .filter((c) => c.status === "available")
    .map((candidate) => {
      // Distance: closer is better (normalized 0-1)
      const distance_score = 1 - candidate.distance_km / maxDistance;

      // Type match: 1.0 if preferred, 0.3 if not
      const type_match_score = preferredTypes.includes(candidate.type) ? 1.0 : 0.3;

      // Availability: always 1.0 for available vehicles (filtered above)
      const availability_score = 1.0;

      // Station load: prefer stations with more available vehicles
      const dispatched_ratio =
        candidate.station_vehicle_count > 0
          ? candidate.station_dispatched_count / candidate.station_vehicle_count
          : 0;
      const load_score = 1 - dispatched_ratio;

      const score =
        WEIGHTS.distance * distance_score +
        WEIGHTS.type_match * type_match_score +
        WEIGHTS.availability * availability_score +
        WEIGHTS.load * load_score;

      return {
        ...candidate,
        score,
        breakdown: { distance_score, type_match_score, availability_score, load_score },
      };
    })
    .sort((a, b) => b.score - a.score);
}
