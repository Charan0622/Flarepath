// Unit Chief console — types, demo data, helpers. All seed data is hand-authored
// so the page feels real even when the DB is thin.

export type IcsPosition =
  | "ic" | "operations" | "safety" | "attack" | "search" | "ventilation" | "rit" | "medical" | "water" | "exterior";

export interface IcsPositionMeta {
  key: IcsPosition;
  label: string;
  short: string;
  color: string;
  priority: number;  // 1 = must staff first
}

export const POSITIONS: IcsPositionMeta[] = [
  { key: "ic",          label: "Incident Commander", short: "IC",  color: "#ef4444", priority: 1 },
  { key: "safety",      label: "Safety Officer",     short: "SAF", color: "#f97316", priority: 2 },
  { key: "attack",      label: "Attack / Line",      short: "ATK", color: "#ef4444", priority: 3 },
  { key: "search",      label: "Search & Rescue",    short: "SAR", color: "#eab308", priority: 4 },
  { key: "ventilation", label: "Ventilation",        short: "VEN", color: "#3b82f6", priority: 5 },
  { key: "rit",         label: "Rapid Intervention", short: "RIT", color: "#22c55e", priority: 6 },
  { key: "medical",     label: "Medical / EMS",      short: "MED", color: "#a855f7", priority: 7 },
  { key: "water",       label: "Water Supply",       short: "WTR", color: "#06b6d4", priority: 8 },
  { key: "exterior",    label: "Exterior / 360",     short: "EXT", color: "#71717a", priority: 9 },
];

export type BenchmarkKey =
  | "arrival_360" | "water_supply" | "line_charged" | "primary_search"
  | "ventilation" | "utilities" | "fire_controlled" | "secondary_search"
  | "loss_stopped" | "overhaul";

export const BENCHMARKS: { key: BenchmarkKey; label: string; critical?: boolean }[] = [
  { key: "arrival_360",     label: "Arrival · 360° size-up",   critical: true },
  { key: "water_supply",    label: "Water supply established", critical: true },
  { key: "line_charged",    label: "Attack line charged",      critical: true },
  { key: "ventilation",     label: "Ventilation coordinated" },
  { key: "utilities",       label: "Utilities secured" },
  { key: "primary_search",  label: "Primary search complete",  critical: true },
  { key: "fire_controlled", label: "Fire controlled",          critical: true },
  { key: "secondary_search",label: "Secondary search complete" },
  { key: "loss_stopped",    label: "Loss stopped" },
  { key: "overhaul",        label: "Overhaul" },
];

export type BuildingSide = "A" | "B" | "C" | "D";
export type SideState = "unknown" | "clear" | "smoke" | "fire" | "victim";

export const SIDE_STATE_META: Record<SideState, { label: string; color: string }> = {
  unknown: { label: "Unknown",          color: "#52525b" },
  clear:   { label: "Clear",            color: "#22c55e" },
  smoke:   { label: "Smoke showing",    color: "#eab308" },
  fire:    { label: "Fire showing",     color: "#ef4444" },
  victim:  { label: "Victim reported",  color: "#a855f7" },
};

export type TaskKey =
  | "primary_search" | "secondary_search" | "attack_line" | "vent_horizontal"
  | "vent_vertical" | "water_supply" | "rit_standby" | "salvage" | "medical" | "exterior_size_up";

export const TASKS: { key: TaskKey; label: string; short: string; position: IcsPosition; color: string }[] = [
  { key: "primary_search",   label: "Primary search",    short: "Search",  position: "search",      color: "#eab308" },
  { key: "secondary_search", label: "Secondary search",  short: "2°Srch",  position: "search",      color: "#eab308" },
  { key: "attack_line",      label: "Attack line",       short: "Attack",  position: "attack",      color: "#ef4444" },
  { key: "vent_horizontal",  label: "Horizontal vent",   short: "Vent-H",  position: "ventilation", color: "#3b82f6" },
  { key: "vent_vertical",    label: "Vertical vent",     short: "Vent-V",  position: "ventilation", color: "#3b82f6" },
  { key: "water_supply",     label: "Water supply",      short: "Water",   position: "water",       color: "#06b6d4" },
  { key: "rit_standby",      label: "RIT standby",       short: "RIT",     position: "rit",         color: "#22c55e" },
  { key: "salvage",          label: "Salvage / overhaul",short: "Salvage", position: "attack",      color: "#a855f7" },
  { key: "medical",          label: "Medical",           short: "Medical", position: "medical",     color: "#a855f7" },
  { key: "exterior_size_up", label: "Exterior 360",      short: "Ext",     position: "exterior",    color: "#71717a" },
];

export interface PrePlan {
  address: string;
  occupancy: string;
  floor_count: number;
  sq_ft: number;
  construction: string;
  standpipe: boolean;
  sprinklers: boolean;
  knox_box: string;
  hazards: string[];
  occupants_typical: number;
  nearest_hydrant_m: number;
  notes: string;
  year_built: number;
}

// Hand-authored pre-plans keyed by our demo addresses so the card always renders.
export const PRE_PLANS: Record<string, PrePlan> = {
  "201 S 4th St, San Jose, CA 95112": {
    address: "201 S 4th St, San Jose, CA 95112",
    occupancy: "Multi-family residential · 12-unit apartment",
    floor_count: 4, sq_ft: 18500, construction: "Type V-A wood frame · stucco exterior",
    standpipe: false, sprinklers: true, knox_box: "N. Main entry",
    hazards: ["Single interior stair", "Bedrooms on C-side", "Underground parking"],
    occupants_typical: 28, nearest_hydrant_m: 42,
    notes: "Kitchen fires in 3B and 4A in past 5 years. Alarm panel in east stairwell.",
    year_built: 1978,
  },
  "70 S 1st St, San Jose, CA 95113": {
    address: "70 S 1st St, San Jose, CA 95113",
    occupancy: "Mixed-use · restaurant below, 8 lofts above",
    floor_count: 3, sq_ft: 11200, construction: "Type III-B · brick with wood joists",
    standpipe: true, sprinklers: true, knox_box: "Alley side (C)",
    hazards: ["Grease hood in kitchen", "Flat roof with skylights", "Heritage facade"],
    occupants_typical: 55, nearest_hydrant_m: 28,
    notes: "Historic 1912 brick. Owner contact: Oliver Chen +1-408-555-0199.",
    year_built: 1912,
  },
  "I-280 at 7th St, San Jose, CA 95112": {
    address: "I-280 at 7th St, San Jose, CA 95112",
    occupancy: "Highway · vehicle incident staging",
    floor_count: 0, sq_ft: 0, construction: "Open roadway",
    standpipe: false, sprinklers: false, knox_box: "—",
    hazards: ["High-speed traffic", "No shoulder westbound", "Jersey barrier median"],
    occupants_typical: 0, nearest_hydrant_m: 180,
    notes: "CHP jurisdiction shared. Closure plan: close outer 2 lanes.",
    year_built: 1957,
  },
  "345 Park Ave, San Jose, CA 95110": {
    address: "345 Park Ave, San Jose, CA 95110",
    occupancy: "Tech campus · data hall wing",
    floor_count: 6, sq_ft: 142000, construction: "Type I-A concrete/steel",
    standpipe: true, sprinklers: true, knox_box: "Security desk lobby (A)",
    hazards: ["UPS battery rooms", "Halon in server room", "Roof-top HVAC"],
    occupants_typical: 800, nearest_hydrant_m: 22,
    notes: "FDC on the A-side. Chief engineer Sanjay Kulkarni on-site 24/7.",
    year_built: 2008,
  },
  "Alum Rock Park, San Jose, CA 95127": {
    address: "Alum Rock Park, San Jose, CA 95127",
    occupancy: "Regional park · wildland interface",
    floor_count: 0, sq_ft: 0, construction: "Open terrain · eucalyptus + grass",
    standpipe: false, sprinklers: false, knox_box: "Ranger station",
    hazards: ["Steep terrain (>30%)", "Limited road access", "Riparian corridor"],
    occupants_typical: 40, nearest_hydrant_m: 1200,
    notes: "Park ranger radio channel: RANGER-1. Helicopter LZ at main lot.",
    year_built: 1872,
  },
  "1073 The Alameda, San Jose, CA 95126": {
    address: "1073 The Alameda, San Jose, CA 95126",
    occupancy: "Commercial · taqueria + 4 lofts upstairs",
    floor_count: 2, sq_ft: 6800, construction: "Type V-B wood frame",
    standpipe: false, sprinklers: false, knox_box: "Rear alley",
    hazards: ["Commercial kitchen grease duct", "Gas service above grade", "Congested parking"],
    occupants_typical: 40, nearest_hydrant_m: 60,
    notes: "Shut-off on A-side curb. Tenant list on clipboard at front register.",
    year_built: 1962,
  },
};

export function getPrePlan(address: string): PrePlan | null {
  return PRE_PLANS[address] ?? null;
}

export interface Hydrant { id: string; lng: number; lat: number; flow_gpm: number; type: string }

// Hand-placed hydrants near each demo address (rough but deterministic).
export const HYDRANTS: Hydrant[] = [
  { id: "h1", lng: -121.8854, lat: 37.3337, flow_gpm: 1250, type: "public" },
  { id: "h2", lng: -121.8845, lat: 37.3330, flow_gpm: 1500, type: "public" },
  { id: "h3", lng: -121.8860, lat: 37.3333, flow_gpm: 900,  type: "public" },
  { id: "h4", lng: -121.8886, lat: 37.3344, flow_gpm: 1500, type: "public" },
  { id: "h5", lng: -121.8894, lat: 37.3338, flow_gpm: 1250, type: "public" },
  { id: "h6", lng: -121.8920, lat: 37.3322, flow_gpm: 1000, type: "public" },
  { id: "h7", lng: -121.8774, lat: 37.3354, flow_gpm: 600,  type: "public" },
  { id: "h8", lng: -121.9072, lat: 37.3432, flow_gpm: 1250, type: "public" },
  { id: "h9", lng: -121.9478, lat: 37.3213, flow_gpm: 1500, type: "public" },
];

export function nearestHydrants(lng: number, lat: number, n = 3): (Hydrant & { distance_m: number })[] {
  const R = 111_320;
  return HYDRANTS.map((h) => {
    const dx = (h.lng - lng) * R * Math.cos((lat * Math.PI) / 180);
    const dy = (h.lat - lat) * R;
    return { ...h, distance_m: Math.round(Math.sqrt(dx * dx + dy * dy)) };
  })
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, n);
}

// Simulated weather snapshot — replace with real API when convenient.
export function demoWeather(seed: string): {
  wind_kph: number; wind_deg: number; temp_c: number; rh: number; fire_weather_index: "low" | "moderate" | "high" | "extreme";
} {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const n = Math.abs(h);
  const wind = 8 + (n % 18);
  const deg = n % 360;
  const temp = 18 + (n % 14);
  const rh = 22 + (n % 50);
  const fwiLvl = rh < 30 && wind > 18 ? "extreme" : rh < 40 ? "high" : rh < 55 ? "moderate" : "low";
  return { wind_kph: wind, wind_deg: deg, temp_c: temp, rh, fire_weather_index: fwiLvl };
}

// Synthetic biometrics. In a real deployment these come from MSA LUNAR or
// an Apple Watch stream; the halos animate off whatever we push.
export interface Biometric {
  badge: string;
  heart_rate: number;      // bpm
  core_temp_c: number;     // °C
  air_psi: number;         // SCBA bottle pressure
  air_time_remaining_s: number;
  radio_hot: boolean;
  status: "nominal" | "elevated" | "warning" | "critical";
}

export function synthesizeBiometric(badge: string, activity: "staged" | "en_route" | "interior" | "exterior" | "rit"): Biometric {
  // Hash for stable per-badge baseline, then add activity-driven deltas.
  let h = 0;
  for (let i = 0; i < badge.length; i++) h = ((h << 5) - h + badge.charCodeAt(i)) | 0;
  const base_hr = 68 + (Math.abs(h) % 14);
  const base_temp = 36.8 + ((Math.abs(h) % 7) / 10);
  const base_psi = 4200 + (Math.abs(h) % 300);

  const drift = (Math.sin(Date.now() / 6000 + (h % 7)) + 1) / 2; // 0..1
  const activityDelta = activity === "interior" ? 65 : activity === "rit" ? 30 : activity === "exterior" ? 20 : 5;
  const hr = Math.round(base_hr + activityDelta + drift * 18);
  const temp = Number((base_temp + (activity === "interior" ? 0.7 : 0.2) + drift * 0.3).toFixed(1));
  const elapsedS = (Math.abs(h) % 900) + Math.floor(Date.now() / 1000) % 600;
  const drainRate = activity === "interior" ? 7 : activity === "exterior" ? 4 : 1;
  const psi = Math.max(600, base_psi - elapsedS * drainRate);
  const remaining = Math.round(psi / drainRate);

  let status: Biometric["status"] = "nominal";
  if (hr > 180 || temp > 38.5 || psi < 1200) status = "critical";
  else if (hr > 160 || temp > 38.0 || psi < 2000) status = "warning";
  else if (hr > 140 || temp > 37.6 || psi < 2800) status = "elevated";

  return {
    badge, heart_rate: hr, core_temp_c: temp, air_psi: psi, air_time_remaining_s: remaining,
    radio_hot: (drift > 0.92), status,
  };
}

// Dispatcher-to-chief streamable order content. If a real order exists,
// use that; this is the fallback.
export function composeOrder(incidentType: string, address: string, severity: string, etaSecs: number): string {
  const t = incidentType.replace(/_/g, " ");
  const eta = Math.ceil(etaSecs / 60);
  return `CMD-1 to unit: ${severity.toUpperCase()} ${t} reported at ${address.split(",")[0]}. Dispatching shortest-path route, ETA ${eta} minute${eta === 1 ? "" : "s"}. Establish command on arrival; confirm 360 and primary search. RIT to stage on Side A. Monitor TAC-1. Acknowledge receipt.`;
}

// ─── Tactical positioning for crew on the map ───────────────────
// Maps a crew member's task to:
//   - which building side they work from (A/B/C/D)
//   - how far from the incident point (meters)
//   - which operational zone (hot/warm/cold)
//
// Positions are placed relative to a central incident point. A/B/C/D use
// cardinal directions for legibility: A = top, B = right, C = bottom,
// D = left. The chief can click any crew marker for details.

export type Zone = "hot" | "warm" | "cold";

export interface CrewPositionHint {
  side: BuildingSide;
  zone: Zone;
  // Offset from the incident point, in meters.
  radius_m: number;
  // Small extra angle within the side's sector for individual crew jitter.
  angle_jitter: number;
}

// Heuristic: given a task, where should the crew show up?
export function positionForTask(task: TaskKey | null, captain: boolean, badge: string): CrewPositionHint {
  // Deterministic jitter per badge
  let h = 0;
  for (let i = 0; i < badge.length; i++) h = ((h << 5) - h + badge.charCodeAt(i)) | 0;
  const jitter = ((Math.abs(h) % 1000) / 1000 - 0.5) * (Math.PI / 6); // ±15°

  if (captain) {
    return { side: "A", zone: "warm", radius_m: 22, angle_jitter: jitter * 0.3 };
  }

  if (!task) {
    // Not assigned yet — stage at apparatus (cold zone, Side A)
    return { side: "A", zone: "cold", radius_m: 44, angle_jitter: jitter };
  }

  switch (task) {
    case "primary_search":
    case "secondary_search":
      // Inside the structure near Side A entry
      return { side: "A", zone: "hot", radius_m: 8, angle_jitter: jitter * 0.8 };
    case "attack_line":
      return { side: "A", zone: "hot", radius_m: 14, angle_jitter: jitter * 0.6 };
    case "vent_horizontal":
      // Opposite of fire side, usually Side B or D
      return { side: h % 2 === 0 ? "B" : "D", zone: "warm", radius_m: 20, angle_jitter: jitter * 0.5 };
    case "vent_vertical":
      // Roof access — top of structure, Side A roof
      return { side: "A", zone: "warm", radius_m: 12, angle_jitter: jitter * 0.3 };
    case "water_supply":
      // At hydrant — significantly offset from incident (cold zone)
      return { side: "B", zone: "cold", radius_m: 55, angle_jitter: jitter };
    case "rit_standby":
      // Pre-positioned on Side A, outside the hot zone (NFPA 1407)
      return { side: "A", zone: "warm", radius_m: 28, angle_jitter: jitter * 0.5 };
    case "salvage":
      return { side: "C", zone: "warm", radius_m: 18, angle_jitter: jitter * 0.6 };
    case "medical":
      // Medical staging at apparatus
      return { side: "A", zone: "cold", radius_m: 40, angle_jitter: jitter };
    case "exterior_size_up":
      // Moving around the perimeter — random side
      return { side: (["A", "B", "C", "D"] as BuildingSide[])[Math.abs(h) % 4], zone: "warm", radius_m: 24, angle_jitter: jitter };
  }
}

// Convert a CrewPositionHint into a [lng, lat] offset from the incident point.
// Adds a time-based drift so crew appear to be moving.
const METERS_PER_DEG_LAT = 111_320;

export function crewLngLat(
  incidentLng: number, incidentLat: number,
  hint: CrewPositionHint,
  nowMs: number,
  badge: string,
): [number, number] {
  // Base angle per side: A=top (north), B=right (east), C=bottom (south), D=left (west)
  const baseAngle: Record<BuildingSide, number> = { A: -Math.PI / 2, B: 0, C: Math.PI / 2, D: Math.PI };
  // Time-based drift — each badge gets its own slow wobble
  let h = 0;
  for (let i = 0; i < badge.length; i++) h = ((h << 5) - h + badge.charCodeAt(i)) | 0;
  const phase = (Math.abs(h) % 1000) / 1000 * Math.PI * 2;
  const driftAngle = Math.sin(nowMs / 4000 + phase) * 0.12;
  const driftRadius = Math.cos(nowMs / 5000 + phase) * 2.5; // ±2.5m
  const theta = baseAngle[hint.side] + hint.angle_jitter + driftAngle;
  const r_m = hint.radius_m + driftRadius;

  const dLat = (Math.cos(theta) * r_m) / METERS_PER_DEG_LAT;
  const dLng = (Math.sin(theta) * r_m) / (METERS_PER_DEG_LAT * Math.cos((incidentLat * Math.PI) / 180));
  // Note: for canonical "north up" we use sin for lng and cos for lat inverted,
  // but the numeric offsets are small enough that this convention keeps A-top / C-bottom.
  return [incidentLng + dLng, incidentLat - dLat];
}

export const ZONE_COLOR: Record<Zone, string> = {
  hot: "#ef4444",
  warm: "#f97316",
  cold: "#3b82f6",
};
export const ZONE_RADIUS_M: Record<Zone, number> = {
  hot: 16,
  warm: 32,
  cold: 60,
};

// Interpolate a position along a LineString by progress t ∈ [0, 1].
export function lerpAlongLine(coords: [number, number][], t: number): [number, number] {
  if (coords.length === 0) return [0, 0];
  if (coords.length === 1) return coords[0];
  const clamp = Math.max(0, Math.min(1, t));
  if (clamp <= 0) return coords[0];
  if (clamp >= 1) return coords[coords.length - 1];
  const segLens: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]);
    segLens.push(d);
    total += d;
  }
  let target = total * clamp;
  for (let i = 0; i < segLens.length; i++) {
    if (target <= segLens[i]) {
      const s = target / segLens[i];
      return [
        coords[i][0] + (coords[i + 1][0] - coords[i][0]) * s,
        coords[i][1] + (coords[i + 1][1] - coords[i][1]) * s,
      ];
    }
    target -= segLens[i];
  }
  return coords[coords.length - 1];
}

// Smooth ease-in-out curve for blending between positions.
export function easeInOut(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

// Demo journey timing: how long the crew takes to traverse the route and
// then disperse to their scene positions. Tuned so a chief opening the page
// sees a ~40-second convoy animation immediately on load.
export const JOURNEY_MS = 28_000;
export const DISPERSE_MS = 3_500;
export const MEMBER_STAGGER_MS = 650;

export type CrewPhase = "staging" | "traveling" | "dispersing" | "on_scene";

export interface JourneyPosition {
  pos: [number, number];
  phase: CrewPhase;
  progress: number; // 0..1 within the current phase
}

export function crewJourneyPosition(
  nowMs: number,
  journeyStartMs: number,
  memberIndex: number,
  route: [number, number][] | null,
  incidentLng: number,
  incidentLat: number,
  hint: CrewPositionHint,
  badge: string,
): JourneyPosition {
  const scenePos = crewLngLat(incidentLng, incidentLat, hint, nowMs, badge);

  // No route available → already at scene
  if (!route || route.length < 2) {
    return { pos: scenePos, phase: "on_scene", progress: 1 };
  }

  const elapsed = nowMs - journeyStartMs - memberIndex * MEMBER_STAGGER_MS;

  if (elapsed < 0) {
    // Still staging at station
    return { pos: route[0], phase: "staging", progress: 0 };
  }

  if (elapsed <= JOURNEY_MS) {
    const p = elapsed / JOURNEY_MS;
    return { pos: lerpAlongLine(route, easeInOut(p)), phase: "traveling", progress: p };
  }

  const dispersedElapsed = elapsed - JOURNEY_MS;
  if (dispersedElapsed <= DISPERSE_MS) {
    const p = dispersedElapsed / DISPERSE_MS;
    const eased = easeInOut(p);
    const arrival = route[route.length - 1];
    return {
      pos: [
        arrival[0] + (scenePos[0] - arrival[0]) * eased,
        arrival[1] + (scenePos[1] - arrival[1]) * eased,
      ],
      phase: "dispersing",
      progress: p,
    };
  }

  return { pos: scenePos, phase: "on_scene", progress: 1 };
}
