/**
 * Demo city: San Jose, California, USA
 *
 * Real San Jose Fire Department station locations and realistic
 * incident scenarios for seeding the database and demo presentations.
 */

export const DEMO_CITY = {
  name: "San Jose",
  center: { lat: 37.3382, lng: -121.8863 },
  zoom: 12,
} as const;

export const STATIONS = [
  {
    name: "SJFD Station 1",
    address: "225 N Market St, San Jose, CA 95110",
    location: { lat: 37.3394, lng: -121.8900 },
  },
  {
    name: "SJFD Station 7",
    address: "800 Emory St, San Jose, CA 95126",
    location: { lat: 37.3295, lng: -121.9148 },
  },
  {
    name: "SJFD Station 30",
    address: "3030 Alum Rock Ave, San Jose, CA 95127",
    location: { lat: 37.3660, lng: -121.8350 },
  },
] as const;

export const VEHICLES = [
  { callSign: "Engine 1", type: "engine" as const, stationIndex: 0, capacity: 6 },
  { callSign: "Engine 7", type: "engine" as const, stationIndex: 1, capacity: 6 },
  { callSign: "Ladder 1", type: "ladder" as const, stationIndex: 0, capacity: 4 },
  { callSign: "Engine 30", type: "engine" as const, stationIndex: 2, capacity: 6 },
  { callSign: "Tanker 7", type: "tanker" as const, stationIndex: 1, capacity: 3 },
  { callSign: "Rescue 30", type: "rescue" as const, stationIndex: 2, capacity: 4 },
] as const;

export const INCIDENT_SCENARIOS = [
  {
    description: "Kitchen fire in a 3rd-floor apartment, smoke visible from street. 2 adults and 1 child reported inside.",
    address: "201 S 4th St, San Jose, CA 95112",
    location: { lat: 37.3335, lng: -121.8850 },
    type: "structure_fire" as const,
    reporterName: "Maria Garcia",
    reporterPhone: "+1 408-555-0101",
    hazards: ["trapped_occupants", "high_rise"],
  },
  {
    description: "Car engulfed in flames on I-280 northbound near 7th Street exit. Traffic blocked in two lanes.",
    address: "I-280 at 7th St, San Jose, CA 95112",
    location: { lat: 37.3350, lng: -121.8770 },
    type: "vehicle_fire" as const,
    reporterName: "James Chen",
    reporterPhone: "+1 408-555-0102",
    hazards: ["fuel_leak", "traffic_hazard"],
  },
  {
    description: "Electrical fire in server room at tech campus. Sprinklers activated but fire not contained. Building evacuated.",
    address: "345 Park Ave, San Jose, CA 95110",
    location: { lat: 37.3318, lng: -121.8916 },
    type: "structure_fire" as const,
    reporterName: "Security Operations",
    reporterPhone: "+1 408-555-0103",
    hazards: ["electrical", "chemical_fumes"],
  },
  {
    description: "Brush fire spreading in Alum Rock Park near hiking trails. Wind pushing toward residential neighborhood.",
    address: "Alum Rock Park, San Jose, CA 95127",
    location: { lat: 37.3862, lng: -121.8230 },
    type: "wildfire" as const,
    reporterName: "Park Ranger Davis",
    reporterPhone: "+1 408-555-0104",
    hazards: ["wind_driven", "residential_exposure"],
  },
  {
    description: "Gas line rupture at taqueria, explosion heard by neighbors. Multiple injuries reported. Structural damage visible.",
    address: "1073 The Alameda, San Jose, CA 95126",
    location: { lat: 37.3430, lng: -121.9070 },
    type: "structure_fire" as const,
    reporterName: "David Nguyen",
    reporterPhone: "+1 408-555-0105",
    hazards: ["gas_leak", "structural_collapse", "mass_casualty"],
  },
  {
    description: "Minor grease fire in restaurant kitchen on Santana Row. Staff attempting to extinguish with fire blanket.",
    address: "377 Santana Row, San Jose, CA 95128",
    location: { lat: 37.3210, lng: -121.9478 },
    type: "structure_fire" as const,
    reporterName: "Chef Rodriguez",
    reporterPhone: "+1 408-555-0106",
    hazards: ["grease_fire"],
  },
  {
    description: "Transformer fire causing power outage in Willow Glen neighborhood. Sparking visible, residents report burning smell.",
    address: "Lincoln Ave & Minnesota Ave, San Jose, CA 95125",
    location: { lat: 37.3080, lng: -121.8990 },
    type: "hazmat" as const,
    reporterName: "PG&E Dispatch",
    reporterPhone: "+1 408-555-0107",
    hazards: ["electrical", "power_lines"],
  },
  {
    description: "Child trapped in locked car in Valley Fair Mall parking lot. Temperature 95°F. Parents unable to open doors.",
    address: "2855 Stevens Creek Blvd, San Jose, CA 95050",
    location: { lat: 37.3246, lng: -121.9452 },
    type: "rescue" as const,
    reporterName: "Mall Security",
    reporterPhone: "+1 408-555-0108",
    hazards: ["heat_emergency", "child_involved"],
  },
  {
    description: "False alarm — smoke detector triggered by cooking smoke in SoFA District loft. No visible fire. Residents safe.",
    address: "70 S 1st St, San Jose, CA 95113",
    location: { lat: 37.3340, lng: -121.8890 },
    type: "false_alarm" as const,
    reporterName: "Building Manager",
    reporterPhone: "+1 408-555-0109",
    hazards: [],
  },
  {
    description: "Chemical spill at semiconductor fab, fumes spreading. Workers reporting breathing difficulty. 20 workers on site.",
    address: "3250 Zanker Rd, San Jose, CA 95134",
    location: { lat: 37.4072, lng: -121.9230 },
    type: "hazmat" as const,
    reporterName: "Plant Safety Officer",
    reporterPhone: "+1 408-555-0110",
    hazards: ["chemical_fumes", "mass_casualty", "industrial"],
  },
] as const;
