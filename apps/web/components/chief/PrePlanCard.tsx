"use client";

import { Building2, Droplets, AlertTriangle, KeyRound, Users } from "lucide-react";
import { getPrePlan } from "@/lib/chief-data";

export default function PrePlanCard({ address }: { address: string }) {
  const plan = getPrePlan(address);

  if (!plan) {
    return (
      <div className="glass-card rounded-xl p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Building2 size={12} style={{ color: "#a855f7" }} />
          <span className="text-[11px] font-semibold text-white">Pre-Incident Plan</span>
        </div>
        <p className="text-[10px] italic" style={{ color: "#71717a" }}>No pre-plan filed for this address.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Building2 size={12} style={{ color: "#a855f7" }} />
          <span className="text-[11px] font-semibold text-white">Pre-Incident Plan</span>
        </div>
        <span className="text-[9px] font-mono" style={{ color: "#71717a" }}>Built {plan.year_built}</span>
      </div>

      <div className="text-[10.5px] leading-relaxed mb-2" style={{ color: "#e4e4e7" }}>{plan.occupancy}</div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <Stat label="Floors" value={String(plan.floor_count)} />
        <Stat label="Sq-ft" value={plan.sq_ft.toLocaleString()} />
        <Stat label="Occupants" value={String(plan.occupants_typical)} icon={Users} />
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <Feature on={plan.sprinklers} label="Sprinklers" />
        <Feature on={plan.standpipe} label="Standpipe" />
      </div>

      <div className="flex items-center gap-1.5 text-[10px] mb-2" style={{ color: "#a1a1aa" }}>
        <KeyRound size={10} />
        <span className="font-mono">Knox: {plan.knox_box}</span>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] mb-2" style={{ color: "#06b6d4" }}>
        <Droplets size={10} />
        <span>Hydrant {plan.nearest_hydrant_m}m</span>
      </div>

      {plan.hazards.length > 0 && (
        <div className="space-y-0.5 mb-2">
          {plan.hazards.map((h) => (
            <div key={h} className="flex items-center gap-1.5 text-[9.5px]" style={{ color: "#f97316" }}>
              <AlertTriangle size={9} />
              <span>{h}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[9.5px] leading-relaxed italic pt-2" style={{ color: "#71717a", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {plan.notes}
      </p>

      <div className="text-[9px] uppercase tracking-wider mt-1.5" style={{ color: "#52525b" }}>
        {plan.construction}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Users }) {
  return (
    <div className="rounded px-2 py-1.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex items-center gap-0.5 text-[8px] uppercase tracking-wider" style={{ color: "#71717a" }}>
        {Icon && <Icon size={8} />}
        <span>{label}</span>
      </div>
      <div className="text-[12px] font-bold tabular-nums text-white leading-tight">{value}</div>
    </div>
  );
}

function Feature({ on, label }: { on: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1 px-1.5 py-1 rounded text-[9.5px]"
      style={{
        background: on ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.06)",
        color: on ? "#22c55e" : "#ef4444",
        border: `1px solid ${on ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.18)"}`,
      }}
    >
      <span className="font-semibold">{on ? "✓" : "✗"}</span>
      <span>{label}</span>
    </div>
  );
}
