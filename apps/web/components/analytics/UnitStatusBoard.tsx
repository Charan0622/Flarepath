"use client";

import { useEffect, useState } from "react";
import { Truck, Radio, AlertCircle } from "lucide-react";
import AnalyticsCard, { MetaChip } from "./AnalyticsCard";
import UnitCrewPopover from "./UnitCrewPopover";

interface Unit {
  id: string;
  call_sign: string;
  type: string;
  station: string | null;
  status: string;
  since: string | null;
  incident_address: string | null;
  incident_severity: string | null;
}

const LANES: { status: string; label: string; color: string }[] = [
  { status: "available", label: "Available", color: "#22c55e" },
  { status: "assigned", label: "Assigned", color: "#f97316" },
  { status: "acknowledged", label: "Ack'd", color: "#f97316" },
  { status: "en_route", label: "En Route", color: "#eab308" },
  { status: "on_scene", label: "On Scene", color: "#3b82f6" },
  { status: "maintenance", label: "OOS", color: "#71717a" },
];

function useRelative(iso: string | null): string {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);
  if (!iso) return "";
  const diff = now - new Date(iso).getTime();
  if (diff < 0) return "now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function UnitCard({ unit, onOpen }: { unit: Unit; onOpen: (u: Unit) => void }) {
  const rel = useRelative(unit.since);
  const lane = LANES.find((l) => l.status === unit.status) ?? LANES[0];
  const fatigue = unit.status === "on_scene" && unit.since && (Date.now() - new Date(unit.since).getTime()) > 45 * 60 * 1000;
  return (
    <button
      type="button"
      onClick={() => onOpen(unit)}
      className="glass-card rounded-md px-2.5 py-1.5 transition-all text-left w-full hover:scale-[1.02] active:scale-[0.98]"
      title={`Click to view ${unit.call_sign} roster`}
      style={{
        borderLeft: `2px solid ${lane.color}`,
        boxShadow: fatigue ? "0 0 10px rgba(239,68,68,0.3)" : undefined,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-white">{unit.call_sign}</span>
        {fatigue && <AlertCircle size={9} style={{ color: "#ef4444" }} />}
        {rel && <span className="ml-auto text-[9px] tabular-nums" style={{ color: fatigue ? "#ef4444" : "#71717a" }}>{rel}</span>}
      </div>
      {unit.incident_address && (
        <div className="text-[9px] mt-0.5 truncate" style={{ color: "#a1a1aa" }}>
          → {unit.incident_address.split(",")[0]}
        </div>
      )}
    </button>
  );
}

export default function UnitStatusBoard({ units, span = 6 }: { units: Unit[]; span?: number }) {
  const [selected, setSelected] = useState<Unit | null>(null);
  const grouped = LANES.map((l) => ({
    ...l,
    units: units.filter((u) => u.status === l.status),
  }));
  const activeUnits = units.filter((u) => u.status !== "available" && u.status !== "maintenance").length;

  return (
    <>
      <AnalyticsCard
        title="Live Unit Status Board"
        subtitle="Every apparatus, grouped by current operational state · click a unit for crew"
        icon={Truck}
        accent="#3b82f6"
        span={span}
        trailing={<MetaChip accent="#3b82f6"><Radio size={9} /> {activeUnits}/{units.length} engaged</MetaChip>}
        footer={<span>45-minute on-scene timer flags fatigue risk · updates every 15s</span>}
      >
        <div className="grid grid-cols-6 gap-2">
          {grouped.map((lane) => (
            <div key={lane.status} className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold" style={{ color: lane.color }}>
                <span className="w-1 h-1 rounded-full" style={{ background: lane.color, boxShadow: `0 0 4px ${lane.color}` }} />
                <span className="truncate">{lane.label}</span>
                <span className="ml-auto tabular-nums opacity-70">{lane.units.length}</span>
              </div>
              <div className="flex flex-col gap-1 min-h-[40px]">
                {lane.units.map((u) => <UnitCard key={u.id} unit={u} onOpen={setSelected} />)}
                {lane.units.length === 0 && (
                  <div className="text-[9px] italic" style={{ color: "#52525b" }}>—</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </AnalyticsCard>

      <UnitCrewPopover unit={selected} onClose={() => setSelected(null)} />
    </>
  );
}
