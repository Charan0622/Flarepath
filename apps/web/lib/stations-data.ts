// Detailed metadata for each fire station beyond the three db columns
// (id, name, address, location). These are realistic but hand-authored —
// the schema could be extended later with a `station_details` table.

export interface StationOfficer {
  name: string;
  rank: string;
  badge: string;
  years: number;
  certifications?: string[];
}

export interface StationInfo {
  code: string;            // short badge ("FS-01")
  name: string;            // DB name ("SJFD Station 1")
  display_name: string;    // friendly name
  address: string;
  established: number;
  coverage_area: string;
  battalion: string;
  chief: StationOfficer;
  shift_commanders: StationOfficer[];
  housed_units: string[];  // DB call-signs ("Engine 1", "Ladder 1")
  specialties: string[];
  primary_freq: string;
  secondary_freq: string;
  phone: string;
  bay_count: number;
  on_duty_per_shift: number;
}

export const STATIONS_INFO: Record<string, StationInfo> = {
  "SJFD Station 1": {
    code: "FS-01",
    name: "SJFD Station 1",
    display_name: "Downtown Headquarters",
    address: "225 N Market St, San Jose, CA 95110",
    established: 1854,
    coverage_area: "Downtown core · SoFA District · SJSU campus · Japantown",
    battalion: "Battalion 1 — North District",
    chief: {
      name: "Marcus Holloway",
      rank: "Battalion Chief",
      badge: "BC-0001",
      years: 26,
      certifications: ["IC-500", "Incident Safety Officer", "Hazmat-Tech"],
    },
    shift_commanders: [
      { name: "Elena Ashford", rank: "Captain (A-Shift)", badge: "CPT-0018", years: 22, certifications: ["IC-400"] },
      { name: "Raymond Ito", rank: "Captain (B-Shift)", badge: "CPT-0021", years: 19, certifications: ["Technical Rescue"] },
      { name: "Dana Kingsley", rank: "Captain (C-Shift)", badge: "CPT-0025", years: 17, certifications: ["IC-300", "EMT-P"] },
    ],
    housed_units: ["Engine 1", "Ladder 1"],
    specialties: ["High-rise operations", "Technical rescue", "Mass casualty"],
    primary_freq: "TAC-1",
    secondary_freq: "OPS-1",
    phone: "+1 408-794-7006",
    bay_count: 4,
    on_duty_per_shift: 12,
  },

  "SJFD Station 7": {
    code: "FS-07",
    name: "SJFD Station 7",
    display_name: "West Station · The Alameda",
    address: "800 Emory St, San Jose, CA 95126",
    established: 1915,
    coverage_area: "The Alameda · Rose Garden · Shasta-Hanchett · Burbank",
    battalion: "Battalion 2 — West District",
    chief: {
      name: "Priyanka Natarajan",
      rank: "Battalion Chief",
      badge: "BC-0002",
      years: 24,
      certifications: ["IC-400", "Wildland-RT", "Water Supply Ops"],
    },
    shift_commanders: [
      { name: "Jordan Okafor", rank: "Captain (A-Shift)", badge: "CPT-0029", years: 18, certifications: ["IC-300", "Wildland-RT"] },
      { name: "Sabrina Voss", rank: "Captain (B-Shift)", badge: "CPT-0034", years: 15, certifications: ["EMT-P"] },
      { name: "Henry Alarcón", rank: "Captain (C-Shift)", badge: "CPT-0037", years: 14, certifications: ["IC-300"] },
    ],
    housed_units: ["Engine 7", "Tanker 7"],
    specialties: ["Wildland interface", "Water-supply / tanker ops", "Rapid-attack pumping"],
    primary_freq: "TAC-2",
    secondary_freq: "OPS-2",
    phone: "+1 408-277-5463",
    bay_count: 3,
    on_duty_per_shift: 9,
  },

  "SJFD Station 30": {
    code: "FS-30",
    name: "SJFD Station 30",
    display_name: "Alum Rock · East Foothills",
    address: "3030 Alum Rock Ave, San Jose, CA 95127",
    established: 1978,
    coverage_area: "Alum Rock · East Foothills · Mt. Pleasant · Evergreen edge",
    battalion: "Battalion 3 — East District",
    chief: {
      name: "Thaddeus Ward",
      rank: "Battalion Chief",
      badge: "BC-0003",
      years: 28,
      certifications: ["IC-500", "USAR Type-I", "Wildland Division Supervisor"],
    },
    shift_commanders: [
      { name: "Mira Goldberg", rank: "Captain (A-Shift)", badge: "CPT-0041", years: 20, certifications: ["Technical Rescue", "USAR"] },
      { name: "Desmond Whitaker", rank: "Captain (B-Shift)", badge: "CPT-0044", years: 16, certifications: ["EMT-P", "Rope Rescue"] },
      { name: "Aya Tanaka", rank: "Captain (C-Shift)", badge: "CPT-0047", years: 13, certifications: ["Wildland-RT"] },
    ],
    housed_units: ["Engine 30", "Rescue 30"],
    specialties: ["Heavy rescue", "Wildland operations", "Confined-space", "Swift-water"],
    primary_freq: "TAC-3",
    secondary_freq: "OPS-3",
    phone: "+1 408-251-5070",
    bay_count: 4,
    on_duty_per_shift: 11,
  },
};

// Helper: resolve "S1" / "S7" / "S30" badge abbreviations back to the full
// DB name the keys in this map use.
export function stationKeyFromAbbrev(abbrev: string): string | null {
  const n = abbrev.replace(/^S/i, "");
  const key = `SJFD Station ${n}`;
  return STATIONS_INFO[key] ? key : null;
}

export function getStationInfo(nameOrAbbrev: string | null | undefined): StationInfo | null {
  if (!nameOrAbbrev) return null;
  if (STATIONS_INFO[nameOrAbbrev]) return STATIONS_INFO[nameOrAbbrev];
  const key = stationKeyFromAbbrev(nameOrAbbrev);
  return key ? STATIONS_INFO[key] : null;
}
