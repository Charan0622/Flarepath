// Flarepath identity — crew rosters & unit names
// Units use standard SJFD-style call-signs (Engine 1, Ladder 1, …).

export interface CrewMember {
  name: string;
  rank: string;
  badge: string;
  years: number;
  certifications?: string[];
}

export interface CrewRoster {
  displayName: string;     // user-facing unit name ("Agni"); DB call-sign stays "Engine 1"
  captain: CrewMember;
  members: CrewMember[];
  radio_channel: string;
  shift: "A" | "B" | "C";
}

export const CREWS: Record<string, CrewRoster> = {
  "Engine 1": {
    displayName: "Engine 1",
    captain: { name: "James Reyes", rank: "Captain", badge: "SJ-0142", years: 18, certifications: ["IC-300", "Hazmat-Tech"] },
    members: [
      { name: "Sarah Chen", rank: "Engineer", badge: "SJ-0287", years: 11, certifications: ["Apparatus Operator"] },
      { name: "Miguel Torres", rank: "Firefighter/Paramedic", badge: "SJ-0304", years: 7, certifications: ["EMT-P", "Rope Rescue"] },
      { name: "Devon Walker", rank: "Firefighter", badge: "SJ-0412", years: 4, certifications: ["FF-II"] },
    ],
    radio_channel: "TAC-1",
    shift: "A",
  },
  "Engine 7": {
    displayName: "Engine 7",
    captain: { name: "Priya Natarajan", rank: "Captain", badge: "SJ-0158", years: 16, certifications: ["IC-300", "Wildland-RT"] },
    members: [
      { name: "Marcus Okafor", rank: "Engineer", badge: "SJ-0291", years: 9 },
      { name: "Jenna Brooks", rank: "Firefighter/Paramedic", badge: "SJ-0356", years: 6, certifications: ["EMT-P"] },
      { name: "Tyler Nguyen", rank: "Firefighter", badge: "SJ-0445", years: 3 },
    ],
    radio_channel: "TAC-2",
    shift: "A",
  },
  "Engine 30": {
    displayName: "Engine 30",
    captain: { name: "Hector Ramirez", rank: "Captain", badge: "SJ-0167", years: 19, certifications: ["IC-400", "Wildland-RT"] },
    members: [
      { name: "Aisha Patel", rank: "Engineer", badge: "SJ-0302", years: 10 },
      { name: "Cole Bennett", rank: "Firefighter", badge: "SJ-0398", years: 5, certifications: ["FF-II", "Swift Water"] },
      { name: "Noah Kim", rank: "Firefighter/Paramedic", badge: "SJ-0461", years: 3, certifications: ["EMT-P"] },
    ],
    radio_channel: "TAC-3",
    shift: "B",
  },
  "Ladder 1": {
    displayName: "Ladder 1",
    captain: { name: "Derek Aldana", rank: "Captain", badge: "SJ-0135", years: 21, certifications: ["IC-400", "Technical Rescue"] },
    members: [
      { name: "Evelyn Park", rank: "Engineer (Tiller)", badge: "SJ-0276", years: 13, certifications: ["Aerial Ops"] },
      { name: "Ravi Shah", rank: "Firefighter", badge: "SJ-0341", years: 8, certifications: ["FF-II", "Rope Rescue"] },
      { name: "Samuel Otieno", rank: "Firefighter/Paramedic", badge: "SJ-0428", years: 6, certifications: ["EMT-P", "Confined Space"] },
    ],
    radio_channel: "TAC-1",
    shift: "A",
  },
  "Tanker 7": {
    displayName: "Tanker 7",
    captain: { name: "Olivia Morales", rank: "Captain", badge: "SJ-0172", years: 15, certifications: ["Wildland-RT", "Water Supply"] },
    members: [
      { name: "Brandon Lee", rank: "Engineer", badge: "SJ-0318", years: 9, certifications: ["Apparatus Operator"] },
      { name: "Hannah Delgado", rank: "Firefighter", badge: "SJ-0403", years: 5 },
    ],
    radio_channel: "TAC-2",
    shift: "B",
  },
  "Rescue 30": {
    displayName: "Rescue 30",
    captain: { name: "Isaiah Thompson", rank: "Captain", badge: "SJ-0149", years: 17, certifications: ["Technical Rescue", "USAR", "Confined Space"] },
    members: [
      { name: "Linh Vu", rank: "Rescue Technician", badge: "SJ-0295", years: 12, certifications: ["USAR", "Rope Rescue", "EMT-P"] },
      { name: "Kwame Johnson", rank: "Rescue Technician/Paramedic", badge: "SJ-0367", years: 8, certifications: ["EMT-P", "Swift Water", "Heavy Rescue"] },
      { name: "Zoe Armstrong", rank: "Firefighter/Paramedic", badge: "SJ-0434", years: 4, certifications: ["EMT-P", "Rope Rescue"] },
    ],
    radio_channel: "TAC-4",
    shift: "A",
  },
};

export function getCrew(callSign: string): CrewRoster | null {
  return CREWS[callSign] ?? null;
}

// Translate a DB call-sign ("Engine 1") into the user-facing display name ("Agni").
// Falls back to the raw call-sign if we don't have a roster for it.
export function displayNameFor(callSign: string | null | undefined): string {
  if (!callSign) return "";
  return CREWS[callSign]?.displayName ?? callSign;
}
