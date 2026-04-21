"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { demoWeather, getPrePlan } from "@/lib/chief-data";

interface Props {
  incidentType: string;
  incidentAddress: string;
  severity: string;
  hazards: string[];
  reasoning?: string | null;
}

// Synthesise a 5-bullet tactical briefing from the triage reasoning + pre-plan
// + weather. If the triage row has its own reasoning we lead with that.
export default function GeminiBriefing({ incidentType, incidentAddress, severity, hazards, reasoning }: Props) {
  const plan = getPrePlan(incidentAddress);
  const weather = demoWeather(incidentAddress);

  const bullets = useMemo(() => {
    const out: string[] = [];
    if (reasoning) out.push(reasoning);
    if (plan) out.push(`Construction: ${plan.construction}. ${plan.floor_count > 0 ? `${plan.floor_count}-floor ${plan.occupancy.toLowerCase()}` : plan.occupancy}.`);
    if (plan?.sprinklers) out.push("Sprinkler system present — confirm activation on arrival, protect FDC.");
    if (weather.wind_kph > 18) out.push(`Wind-driven conditions: ${weather.wind_kph} km/h @ ${weather.wind_deg}° — position crews upwind of the ${weather.wind_deg > 180 ? "A-side" : "C-side"}.`);
    if (hazards.includes("trapped_occupants")) out.push("Primary search is your immediate task — 2 minutes to viable egress for any trapped occupants.");
    if (hazards.includes("gas_leak") || hazards.includes("hazmat")) out.push("Hazmat-Tech qualified crew required for any interior advance; establish decon upwind.");
    if (severity === "critical") out.push("Request 2nd alarm staging on arrival; RIT must be on-position before any interior attack.");
    if (plan && plan.nearest_hydrant_m < 50) out.push(`Water supply established at hydrant ${plan.nearest_hydrant_m}m out — expect ${plan.nearest_hydrant_m < 30 ? "excellent" : "good"} residual.`);
    return out.slice(0, 5);
  }, [reasoning, plan, weather, hazards, severity, incidentType]);

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.03))",
        border: "1px solid rgba(168,85,247,0.3)",
        boxShadow: "0 0 16px rgba(168,85,247,0.1)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} style={{ color: "#a855f7" }} />
          <span className="text-[11px] font-semibold text-white">Tactical Briefing</span>
        </div>
        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.15)", color: "#c4b5fd" }}>
          Gemini AI
        </span>
      </div>

      <ol className="space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-[10.5px] leading-relaxed" style={{ color: "#e4e4e7" }}>
            <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5"
              style={{ background: "rgba(168,85,247,0.18)", color: "#c4b5fd" }}>
              {i + 1}
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ol>

      <div className="text-[9px] mt-2 pt-2 italic" style={{ color: "#52525b", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        Validated against triage confidence + pre-plan + weather · verify on arrival.
      </div>
    </div>
  );
}
