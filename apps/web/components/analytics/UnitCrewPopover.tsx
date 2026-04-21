"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Shield, Radio, MapPin, Clock, Users, Truck, AlertCircle } from "lucide-react";
import { useUnit } from "@/lib/crew-store";

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

const STATUS_COLOR: Record<string, string> = {
  available: "#22c55e",
  assigned: "#f97316",
  acknowledged: "#f97316",
  en_route: "#eab308",
  on_scene: "#3b82f6",
  returning: "#a855f7",
  completed: "#71717a",
  maintenance: "#71717a",
};

const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};

const TYPE_LABEL: Record<string, string> = {
  engine: "Engine Company",
  ladder: "Ladder / Truck Company",
  tanker: "Tanker",
  rescue: "Heavy Rescue",
  ambulance: "Ambulance",
};

function fmtSince(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

interface Props {
  unit: Unit | null;
  onClose: () => void;
}

export default function UnitCrewPopover({ unit, onClose }: Props) {
  const roster = useUnit(unit?.call_sign ?? null);

  // ESC closes
  useEffect(() => {
    if (!unit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unit, onClose]);

  const statusColor = unit ? STATUS_COLOR[unit.status] ?? "#a1a1aa" : "#a1a1aa";
  const fatigue = unit?.status === "on_scene" && unit.since
    && (Date.now() - new Date(unit.since).getTime()) > 45 * 60 * 1000;

  return (
    <AnimatePresence>
      {unit && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          {/* Heavy backdrop blur */}
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(4,4,8,0.55)",
              backdropFilter: "blur(16px) saturate(130%)",
              WebkitBackdropFilter: "blur(16px) saturate(130%)",
            }}
          />

          {/* Glass dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong relative rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
            style={{
              boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px rgba(239,68,68,0.12)",
            }}
          >
            {/* Header */}
            <header className="relative px-5 py-4 glass-divider-b">
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(90deg, transparent, ${statusColor}, transparent)` }}
              />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: `${statusColor}1a`,
                      border: `1px solid ${statusColor}55`,
                      boxShadow: `0 0 20px ${statusColor}30`,
                    }}
                  >
                    <Truck size={20} style={{ color: statusColor }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-[18px] font-bold text-white tracking-tight">{unit.call_sign}</h2>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                        style={{ background: `${statusColor}20`, color: statusColor }}
                      >
                        {unit.status.replace(/_/g, " ")}
                      </span>
                      {fatigue && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                          <AlertCircle size={9} /> fatigue
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: "#a1a1aa" }}>
                      {TYPE_LABEL[unit.type] ?? unit.type}
                      {unit.station && <> · {unit.station}</>}
                      {roster && <> · Shift {roster.shift}</>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md hover:bg-white/[0.05] transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X size={16} style={{ color: "#a1a1aa" }} />
                </button>
              </div>
            </header>

            {/* Metric strip */}
            <div className="grid grid-cols-3 gap-px" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <MetricTile icon={Clock} label="Status age" value={fmtSince(unit.since)} color={fatigue ? "#ef4444" : "#e4e4e7"} />
              <MetricTile icon={Radio} label="Channel" value={roster?.radio_channel ?? "—"} mono />
              <MetricTile icon={MapPin} label="Assigned" value={unit.incident_address ? unit.incident_address.split(",")[0] : "—"} truncate severity={unit.incident_severity} />
            </div>

            {/* Scroll body */}
            <div className="flex-1 overflow-auto p-4">
              {roster ? (
                <>
                  {/* Captain */}
                  {roster.captain ? (
                    <div
                      className="rounded-xl p-3 mb-3"
                      style={{
                        background: "linear-gradient(135deg, rgba(234,179,8,0.09), rgba(234,179,8,0.02))",
                        border: "1px solid rgba(234,179,8,0.3)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(234,179,8,0.2)", border: "1px solid rgba(234,179,8,0.5)" }}>
                            <Star size={15} fill="#eab308" stroke="#eab308" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-white truncate">{roster.captain.name}</div>
                            <div className="text-[10px]" style={{ color: "#eab308" }}>
                              {roster.captain.rank} · Unit Leader
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-mono" style={{ color: "#a1a1aa" }}>{roster.captain.badge}</div>
                          <div className="text-[9px]" style={{ color: "#71717a" }}>{roster.captain.years}y service</div>
                        </div>
                      </div>
                      {roster.captain.certifications && roster.captain.certifications.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {roster.captain.certifications.map((c) => (
                            <span key={c} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(234,179,8,0.14)", color: "#eab308" }}>{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg p-3 mb-3 text-[11px] italic" style={{ background: "rgba(234,179,8,0.04)", border: "1px dashed rgba(234,179,8,0.25)", color: "#71717a" }}>
                      No captain assigned
                    </div>
                  )}

                  {/* Crew header */}
                  <div className="flex items-center gap-2 mb-2 mt-1">
                    <Users size={12} style={{ color: "#a1a1aa" }} />
                    <span className="text-[11px] font-semibold text-white">Crew</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded tabular-nums" style={{ background: "rgba(255,255,255,0.05)", color: "#a1a1aa" }}>
                      {roster.members.length}
                    </span>
                  </div>

                  {/* Members */}
                  <div className="space-y-1.5">
                    {roster.members.map((m) => (
                      <div
                        key={m.badge}
                        className="rounded-lg p-2.5 glass-card"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                              <Shield size={11} style={{ color: "#a1a1aa" }} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[12px] font-medium text-white truncate">{m.name}</div>
                              <div className="text-[10px]" style={{ color: "#a1a1aa" }}>{m.rank}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[10px] font-mono" style={{ color: "#71717a" }}>{m.badge}</div>
                            <div className="text-[9px]" style={{ color: "#52525b" }}>{m.years}y</div>
                          </div>
                        </div>
                        {m.certifications && m.certifications.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1 pl-9">
                            {m.certifications.map((c) => (
                              <span key={c} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#a1a1aa" }}>{c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {roster.members.length === 0 && (
                      <div className="text-[11px] italic text-center py-4" style={{ color: "#71717a" }}>
                        Roster empty — assign members from the Teams page
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-center py-8" style={{ color: "#71717a" }}>
                  No crew roster on file for {unit.call_sign}
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="px-4 py-2.5 text-[10px] flex items-center gap-2 glass-divider-t" style={{ color: "#71717a" }}>
              <Radio size={10} />
              Monitor <span className="font-mono text-[#a1a1aa]">{roster?.radio_channel ?? "—"}</span> for unit comms · press <kbd className="px-1 rounded text-[9px]" style={{ background: "rgba(255,255,255,0.06)" }}>Esc</kbd> to close
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MetricTile({
  icon: Icon, label, value, color = "#e4e4e7", mono, truncate, severity,
}: { icon: typeof Clock; label: string; value: string; color?: string; mono?: boolean; truncate?: boolean; severity?: string | null }) {
  return (
    <div className="px-3 py-2.5 flex flex-col gap-0.5" style={{ background: "rgba(10,10,14,0.5)" }}>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider" style={{ color: "#71717a" }}>
        <Icon size={9} />
        <span>{label}</span>
      </div>
      <span
        className={`text-[12px] font-bold tabular-nums ${truncate ? "truncate" : ""} ${mono ? "font-mono" : ""}`}
        style={{ color: severity ? SEV_COLOR[severity] ?? color : color }}
      >
        {value}
      </span>
    </div>
  );
}
