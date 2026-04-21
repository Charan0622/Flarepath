"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Star, Shield, Radio, MapPin, Clock, Users, Truck,
  Building2, Phone, Calendar, Flame, Award,
} from "lucide-react";
import { getStationInfo } from "@/lib/stations-data";
import { useCrew } from "@/lib/crew-store";

interface Props {
  stationName: string | null;
  onClose: () => void;
}

const TYPE_COLOR: Record<string, string> = {
  engine: "#ef4444",
  ladder: "#f97316",
  tanker: "#eab308",
  rescue: "#22c55e",
  ambulance: "#3b82f6",
};

export default function StationDetailPopover({ stationName, onClose }: Props) {
  const info = getStationInfo(stationName);
  const { state } = useCrew();

  // ESC closes
  useEffect(() => {
    if (!stationName) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stationName, onClose]);

  if (!info) return null;

  const unitsHere = info.housed_units.map((cs) => state.units[cs]).filter(Boolean);
  const totalPersonnel = unitsHere.reduce((n, u) => n + (u.captain ? 1 : 0) + u.members.length, 0)
    + 1 /* Battalion Chief */
    + info.shift_commanders.length;

  return (
    <AnimatePresence>
      {stationName && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(4,4,8,0.55)",
              backdropFilter: "blur(18px) saturate(130%)",
              WebkitBackdropFilter: "blur(18px) saturate(130%)",
            }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong relative rounded-2xl w-full max-w-2xl max-h-[86vh] flex flex-col overflow-hidden"
            style={{
              boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px rgba(59,130,246,0.15)",
            }}
          >
            {/* Accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: "linear-gradient(90deg, transparent, #60a5fa, transparent)" }}
            />

            {/* Header */}
            <header className="px-6 py-4 glass-divider-b">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(37,99,235,0.1))",
                      border: "1px solid rgba(96,165,250,0.5)",
                      boxShadow: "0 0 20px rgba(59,130,246,0.3)",
                    }}
                  >
                    <Building2 size={22} style={{ color: "#60a5fa" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-[20px] font-bold text-white tracking-tight">{info.display_name}</h2>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono" style={{ background: "rgba(96,165,250,0.15)", color: "#93c5fd" }}>
                        {info.code}
                      </span>
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: "#a1a1aa" }}>
                      {info.name} · {info.battalion} · Est. {info.established}
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

            {/* Metrics strip */}
            <div className="grid grid-cols-4 gap-px" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <MetricTile icon={Users} label="On duty" value={`${totalPersonnel}`} accent="#22c55e" />
              <MetricTile icon={Truck} label="Apparatus" value={`${info.housed_units.length} / ${info.bay_count} bays`} accent="#f97316" />
              <MetricTile icon={Radio} label="Primary" value={info.primary_freq} accent="#3b82f6" mono />
              <MetricTile icon={Calendar} label="Since" value={`${info.established}`} accent="#a855f7" />
            </div>

            {/* Scroll body */}
            <div className="flex-1 overflow-auto p-5 space-y-5">
              {/* Address + phone */}
              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={MapPin} label="Address" value={info.address} />
                <InfoRow icon={Phone} label="Phone" value={info.phone} mono />
                <InfoRow icon={Flame} label="Coverage area" value={info.coverage_area} span={2} />
              </div>

              {/* Battalion Chief */}
              <section>
                <SectionHeader icon={Award} label="Commanding Officer" accent="#eab308" />
                <OfficerCard officer={info.chief} highlight />
              </section>

              {/* Shift Commanders */}
              <section>
                <SectionHeader icon={Star} label="Shift Commanders" accent="#f97316" count={info.shift_commanders.length} />
                <div className="grid grid-cols-3 gap-2">
                  {info.shift_commanders.map((o) => (
                    <OfficerCard key={o.badge} officer={o} compact />
                  ))}
                </div>
              </section>

              {/* Apparatus */}
              <section>
                <SectionHeader icon={Truck} label="Apparatus & Crew" accent="#ef4444" count={unitsHere.length} />
                <div className="space-y-3">
                  {unitsHere.map((u) => {
                    const color = TYPE_COLOR[u.type] ?? "#a1a1aa";
                    const count = (u.captain ? 1 : 0) + u.members.length;
                    return (
                      <div
                        key={u.callSign}
                        className="rounded-lg p-3"
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderLeft: `3px solid ${color}`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Truck size={14} style={{ color }} />
                            <span className="text-[13px] font-bold text-white">{u.callSign}</span>
                            <span className="text-[9px] uppercase font-bold tracking-wider" style={{ color }}>{u.type}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px]" style={{ color: "#71717a" }}>
                            <Users size={10} /> {count}
                            <span className="mx-1">·</span>
                            <Radio size={10} /> <span className="font-mono">{u.radio_channel}</span>
                            <span className="mx-1">·</span>
                            <span>Shift {u.shift}</span>
                          </div>
                        </div>

                        {/* Captain */}
                        {u.captain ? (
                          <div className="flex items-center gap-2 mb-2 pl-1">
                            <Star size={11} fill="#eab308" stroke="#eab308" />
                            <span className="text-[11px] font-semibold text-white">{u.captain.name}</span>
                            <span className="text-[10px]" style={{ color: "#eab308" }}>{u.captain.rank}</span>
                            <span className="text-[9px] font-mono ml-auto" style={{ color: "#71717a" }}>{u.captain.badge} · {u.captain.years}y</span>
                          </div>
                        ) : (
                          <div className="text-[10px] italic mb-2 pl-1" style={{ color: "#71717a" }}>No captain assigned</div>
                        )}

                        {/* Members */}
                        {u.members.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 pl-1">
                            {u.members.map((m) => (
                              <div key={m.badge} className="flex items-center gap-1.5 text-[10px]" style={{ color: "#a1a1aa" }}>
                                <Shield size={9} style={{ color: "#52525b" }} />
                                <span className="truncate">{m.name}</span>
                                <span className="ml-auto text-[9px] font-mono shrink-0" style={{ color: "#52525b" }}>{m.badge}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {unitsHere.length === 0 && (
                    <div className="text-[11px] italic text-center py-4" style={{ color: "#71717a" }}>
                      No apparatus housed at this station
                    </div>
                  )}
                </div>
              </section>

              {/* Specialties */}
              <section>
                <SectionHeader icon={Flame} label="Specialties & Capabilities" accent="#a855f7" />
                <div className="flex flex-wrap gap-1.5">
                  {info.specialties.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] px-2 py-1 rounded"
                      style={{ background: "rgba(168,85,247,0.12)", color: "#c4b5fd", border: "1px solid rgba(168,85,247,0.25)" }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            </div>

            {/* Footer */}
            <footer className="px-5 py-3 text-[10px] flex items-center gap-2 glass-divider-t" style={{ color: "#71717a" }}>
              <Radio size={10} />
              Monitor <span className="font-mono text-[#a1a1aa]">{info.primary_freq}</span> / <span className="font-mono text-[#a1a1aa]">{info.secondary_freq}</span> · press <kbd className="px-1 rounded text-[9px]" style={{ background: "rgba(255,255,255,0.06)" }}>Esc</kbd> to close
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MetricTile({
  icon: Icon, label, value, accent, mono,
}: { icon: typeof Clock; label: string; value: string; accent: string; mono?: boolean }) {
  return (
    <div className="px-3 py-2.5 flex flex-col gap-0.5" style={{ background: "rgba(10,10,14,0.5)" }}>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider" style={{ color: "#71717a" }}>
        <Icon size={9} style={{ color: accent }} />
        <span>{label}</span>
      </div>
      <span className={`text-[13px] font-bold tabular-nums ${mono ? "font-mono" : ""}`} style={{ color: accent }}>
        {value}
      </span>
    </div>
  );
}

function InfoRow({
  icon: Icon, label, value, span = 1, mono,
}: { icon: typeof Clock; label: string; value: string; span?: number; mono?: boolean }) {
  return (
    <div className={`flex items-start gap-2 ${span === 2 ? "col-span-2" : ""}`}>
      <Icon size={12} className="mt-0.5 shrink-0" style={{ color: "#71717a" }} />
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wider" style={{ color: "#71717a" }}>{label}</div>
        <div className={`text-[11px] text-white ${mono ? "font-mono" : ""}`}>{value}</div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon, label, accent, count,
}: { icon: typeof Clock; label: string; accent: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon size={12} style={{ color: accent }} />
      <span className="text-[11px] font-semibold text-white uppercase tracking-wider" style={{ letterSpacing: "0.12em" }}>{label}</span>
      {count !== undefined && (
        <span className="text-[10px] px-1.5 py-0.5 rounded tabular-nums" style={{ background: "rgba(255,255,255,0.05)", color: "#a1a1aa" }}>
          {count}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

function OfficerCard({
  officer, highlight = false, compact = false,
}: { officer: { name: string; rank: string; badge: string; years: number; certifications?: string[] }; highlight?: boolean; compact?: boolean }) {
  const accent = highlight ? "#eab308" : "#f97316";
  const accentRgb = highlight ? "234,179,8" : "249,115,22";
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: highlight
          ? `linear-gradient(135deg, rgba(${accentRgb},0.1), rgba(${accentRgb},0.02))`
          : "rgba(255,255,255,0.02)",
        border: `1px solid rgba(${accentRgb},${highlight ? 0.3 : 0.2})`,
      }}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `rgba(${accentRgb},0.2)`, border: `1px solid rgba(${accentRgb},0.45)` }}
        >
          <Star size={13} fill={accent} stroke={accent} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`font-semibold text-white truncate ${compact ? "text-[11px]" : "text-[13px]"}`}>
            {officer.name}
          </div>
          <div className={compact ? "text-[9px]" : "text-[10px]"} style={{ color: accent }}>
            {officer.rank}
          </div>
          <div className="text-[9px] font-mono mt-0.5 flex items-center gap-2" style={{ color: "#71717a" }}>
            <span>{officer.badge}</span>
            <span>·</span>
            <span>{officer.years}y service</span>
          </div>
        </div>
      </div>
      {officer.certifications && officer.certifications.length > 0 && !compact && (
        <div className="mt-2 flex flex-wrap gap-1">
          {officer.certifications.map((c) => (
            <span
              key={c}
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: `rgba(${accentRgb},0.14)`, color: accent }}
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
