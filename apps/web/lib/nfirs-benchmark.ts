// National NFIRS 2024 incident-type distribution — approximation rolled up
// from USFA public tallies (33.3M total responses, ~1.2M fire). Used for the
// "how does our mix compare to the national average" benchmark card.

export interface NfirsBenchmark {
  type: string;
  label: string;
  national_pct: number;   // 0-1 share of national 911-fire responses
}

export const NFIRS_BENCHMARK: NfirsBenchmark[] = [
  { type: "medical",        label: "Medical / EMS",    national_pct: 0.647 },
  { type: "false_alarm",    label: "False Alarm",      national_pct: 0.088 },
  { type: "structure_fire", label: "Structure Fire",   national_pct: 0.034 },
  { type: "vehicle_fire",   label: "Vehicle Fire",     national_pct: 0.018 },
  { type: "wildfire",       label: "Wildfire",         national_pct: 0.012 },
  { type: "hazmat",         label: "Hazmat",           national_pct: 0.020 },
  { type: "rescue",         label: "Rescue",           national_pct: 0.041 },
  { type: "other",          label: "Other",            national_pct: 0.140 },
];

export const NFIRS_SOURCE = {
  year: 2024,
  publisher: "USFA / NFIRS",
  link: "https://www.usfa.fema.gov/nfirs/",
};
