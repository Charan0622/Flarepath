"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X, Radio, MapPin, Clock, Gauge, Shield, ChevronRight,
  Star, Users, Headphones, Truck,
} from "lucide-react";
import { useUnit } from "@/lib/crew-store";

interface Dispatch {
  id: string;
  incident_id: string;
  vehicle_id: string;
  status: string;
  eta_seconds: number | null;
  distance_m: number | null;
  assigned_at?: string;
  en_route_at?: string;
  on_scene_at?: string;
  vehicle: { id: string; call_sign: string; type: string; station_id: string } | null;
  incident: { id: string; type: string; severity: string; address: string; status: string } | null;
}

interface Station { id: string; name: string; address: string }

async function fetchActive(): Promise<Dispatch[]> {
  const res = await fetch("/api/dispatch/active");
  return (await res.json()).data?.dispatches ?? [];
}

const STATION_NAMES: Record<string, string> = {
  // Keyed by call_sign since we don't have stations API here; station name decoded from call-sign prefix
};

const TYPE_LABEL: Record<string, string> = {
  engine: "Engine Company",
  ladder: "Ladder / Truck Company",
  tanker: "Tanker",
  rescue: "Heavy Rescue",
  ambulance: "Ambulance",
};

const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};

const STATUS_COLOR: Record<string, string> = {
  assigned: "#f97316",
  acknowledged: "#f97316",
  en_route: "#eab308",
  on_scene: "#22c55e",
  returning: "#3b82f6",
  completed: "#71717a",
};

const STATUS_LABEL: Record<string, string> = {
  assigned: "Assigned",
  acknowledged: "Acknowledged",
  en_route: "En Route",
  on_scene: "On Scene",
  returning: "Returning",
  completed: "Completed",
};

interface Props {
  dispatchId: string;
  onClose: () => void;
  onOpenIncident: (incidentId: string) => void;
}

export default function UnitDetailPanel({ dispatchId, onClose, onOpenIncident }: Props) {
  const { data: dispatches = [], isLoading } = useQuery({
    queryKey: ["active-dispatches"],
    queryFn: fetchActive,
    refetchInterval: 8000,
  });

  const dispatch = useMemo(
    () => dispatches.find((d) => d.id === dispatchId) ?? null,
    [dispatches, dispatchId]
  );

  const callSign = dispatch?.vehicle?.call_sign ?? null;
  const unit = useUnit(callSign);

  if (isLoading && !dispatch) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#eab308] border-t-transparent" />
      </div>
    );
  }
  if (!dispatch || !dispatch.vehicle) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-[12px] text-[#71717a]">Unit no longer active.</p>
        <button onClick={onClose} className="mt-3 text-[11px] text-[#a1a1aa] hover:text-white">
          Close
        </button>
      </div>
    );
  }

  const v = dispatch.vehicle;
  const i = dispatch.incident;
  const crew = unit
    ? { captain: unit.captain, members: unit.members, radio_channel: unit.radio_channel, shift: unit.shift }
    : null;
  const statusColor = STATUS_COLOR[dispatch.status] ?? "#71717a";
  const statusLabel = STATUS_LABEL[dispatch.status] ?? dispatch.status;
  const etaMin = dispatch.eta_seconds ? Math.ceil(dispatch.eta_seconds / 60) : null;
  const distKm = dispatch.distance_m ? (dispatch.distance_m / 1000).toFixed(1) : null;
  const totalCrew = (crew?.captain ? 1 : 0) + (crew?.members.length ?? 0);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${statusColor}1a`, border: `1px solid ${statusColor}60` }}
          >
            <Truck size={16} style={{ color: statusColor }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-bold text-white tracking-tight">{unit?.displayName ?? v.call_sign}</h2>
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                style={{ background: `${statusColor}20`, color: statusColor }}
              >
                {statusLabel}
              </span>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: "#71717a" }}>
              {v.call_sign} · {TYPE_LABEL[v.type] ?? v.type} · {STATION_NAMES[v.station_id] ?? `SJFD Station ${v.call_sign.split(" ")[1] ?? ""}`}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="rounded p-1 text-[#71717a] hover:bg-white/[0.05] hover:text-white shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Scroll body */}
      <div className="flex-1 overflow-auto">
        {/* Assignment */}
        {i && (
          <button
            type="button"
            onClick={() => onOpenIncident(i.id)}
            className="w-full text-left px-4 py-3 transition-colors hover:bg-white/[0.02]"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#71717a" }}>
                Responding To
              </span>
              <ChevronRight size={12} style={{ color: "#52525b" }} />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: SEV_COLOR[i.severity] ?? "#71717a" }} />
              <span className="text-[12px] font-semibold text-white capitalize">{i.type.replace(/_/g, " ")}</span>
              <span className="text-[9px] uppercase font-bold tracking-wider" style={{ color: SEV_COLOR[i.severity] }}>
                {i.severity}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px]" style={{ color: "#a1a1aa" }}>
              <MapPin size={10} />
              <span className="truncate">{i.address.split(",")[0]}</span>
            </div>
          </button>
        )}

        {/* ETA / Distance / Radio */}
        <div className="grid grid-cols-3 gap-px" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="px-3 py-2.5 flex flex-col items-start gap-0.5" style={{ background: "#0a0a0e" }}>
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider" style={{ color: "#71717a" }}>
              <Clock size={9} /> ETA
            </div>
            <span className="text-[15px] font-bold text-white tabular-nums">
              {etaMin ?? "—"}<span className="text-[10px] text-[#71717a] ml-0.5">min</span>
            </span>
          </div>
          <div className="px-3 py-2.5 flex flex-col items-start gap-0.5" style={{ background: "#0a0a0e" }}>
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider" style={{ color: "#71717a" }}>
              <Gauge size={9} /> Dist
            </div>
            <span className="text-[15px] font-bold text-white tabular-nums">
              {distKm ?? "—"}<span className="text-[10px] text-[#71717a] ml-0.5">km</span>
            </span>
          </div>
          <div className="px-3 py-2.5 flex flex-col items-start gap-0.5" style={{ background: "#0a0a0e" }}>
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider" style={{ color: "#71717a" }}>
              <Radio size={9} /> Channel
            </div>
            <span className="text-[15px] font-bold text-white tabular-nums">
              {crew?.radio_channel ?? "—"}
            </span>
          </div>
        </div>

        {/* Crew */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <Users size={12} style={{ color: "#a1a1aa" }} />
            <span className="text-[11px] font-semibold text-white">Crew</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded tabular-nums" style={{ background: "rgba(255,255,255,0.05)", color: "#a1a1aa" }}>
              {totalCrew}
            </span>
            {crew && (
              <span className="ml-auto text-[9px] uppercase tracking-wider" style={{ color: "#71717a" }}>
                Shift {crew.shift}
              </span>
            )}
          </div>

          {crew ? (
            <div className="space-y-2">
              {/* Captain — highlighted */}
              {crew.captain ? (
                <div
                  className="rounded-lg p-3"
                  style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.08), rgba(234,179,8,0.02))", border: "1px solid rgba(234,179,8,0.25)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(234,179,8,0.2)", border: "1px solid rgba(234,179,8,0.4)" }}>
                        <Star size={12} fill="#eab308" stroke="#eab308" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-white truncate">{crew.captain.name}</div>
                        <div className="text-[10px]" style={{ color: "#eab308" }}>
                          {crew.captain.rank} · Unit Leader
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[9px] font-mono tabular-nums" style={{ color: "#a1a1aa" }}>
                        {crew.captain.badge}
                      </div>
                      <div className="text-[9px]" style={{ color: "#71717a" }}>
                        {crew.captain.years}y service
                      </div>
                    </div>
                  </div>
                  {crew.captain.certifications && crew.captain.certifications.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {crew.captain.certifications.map((c) => (
                        <span key={c} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(234,179,8,0.12)", color: "#eab308" }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg p-3 text-[11px] italic" style={{ background: "rgba(234,179,8,0.04)", border: "1px dashed rgba(234,179,8,0.25)", color: "#71717a" }}>
                  No captain assigned — promote a member from the Teams page.
                </div>
              )}

              {/* Members */}
              {crew.members.map((m) => (
                <div
                  key={m.badge}
                  className="rounded-lg p-2.5"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <Shield size={10} style={{ color: "#a1a1aa" }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-white truncate">{m.name}</div>
                        <div className="text-[10px]" style={{ color: "#a1a1aa" }}>{m.rank}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[9px] font-mono tabular-nums" style={{ color: "#71717a" }}>
                        {m.badge}
                      </div>
                      <div className="text-[9px]" style={{ color: "#52525b" }}>
                        {m.years}y
                      </div>
                    </div>
                  </div>
                  {m.certifications && m.certifications.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1 pl-8">
                      {m.certifications.map((c) => (
                        <span key={c} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#a1a1aa" }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px]" style={{ color: "#71717a" }}>No roster on file for this unit.</p>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-3 mt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "#52525b" }}>
            <Headphones size={10} />
            <span>Monitor <span className="text-[#a1a1aa] font-mono">{crew?.radio_channel ?? "—"}</span> for unit comms.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
