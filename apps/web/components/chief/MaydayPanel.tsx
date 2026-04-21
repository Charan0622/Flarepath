"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useChief } from "@/lib/chief-store";
import type { CrewMember } from "@/lib/crew-data";

interface Props {
  unit: string;
  captain: CrewMember | null;
  members: CrewMember[];
}

// LUNAR Mayday scaffold — one-tap red bar triggers a full-screen curtain
// with pre-filled Location / Unit / Name / Assignment-Air / Resources fields.
export default function MaydayPanel({ unit, captain, members }: Props) {
  const { state, raiseMayday, resolveMayday } = useChief();
  const active = state.mayday && !state.mayday.resolved_at;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    badge: captain?.badge ?? "",
    name: captain?.name ?? "",
    location: "Side A · 2nd floor",
    assignment: "Attack line · low air",
    air_pressure: "1100 psi",
    resources: "RIT with thermal camera",
  });

  function submit() {
    raiseMayday({
      badge: form.badge,
      name: form.name,
      unit,
      location: form.location,
      assignment: form.assignment,
      air_pressure: form.air_pressure,
      resources: form.resources,
      raised_at: new Date().toISOString(),
      resolved_at: null,
    });
    setOpen(false);
  }

  return (
    <>
      {active ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl p-3"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.1))",
            border: "2px solid #ef4444",
            boxShadow: "0 0 32px rgba(239,68,68,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <AlertTriangle size={16} style={{ color: "#ef4444" }} />
              </motion.div>
              <span className="text-[13px] font-bold tracking-wider text-white">MAYDAY ACTIVE</span>
            </div>
            <button onClick={resolveMayday} className="text-[9px] font-semibold px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.08)", color: "#e4e4e7" }}>
              RESOLVE
            </button>
          </div>
          <div className="space-y-1 text-[11px]" style={{ color: "#fecaca" }}>
            <div><span className="text-[9px] uppercase mr-1" style={{ color: "#f87171" }}>L</span>{state.mayday!.location}</div>
            <div><span className="text-[9px] uppercase mr-1" style={{ color: "#f87171" }}>U</span>{state.mayday!.unit}</div>
            <div><span className="text-[9px] uppercase mr-1" style={{ color: "#f87171" }}>N</span>{state.mayday!.name}</div>
            <div><span className="text-[9px] uppercase mr-1" style={{ color: "#f87171" }}>A</span>{state.mayday!.assignment} · {state.mayday!.air_pressure}</div>
            <div><span className="text-[9px] uppercase mr-1" style={{ color: "#f87171" }}>R</span>{state.mayday!.resources}</div>
          </div>
        </motion.div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-xl p-3 flex items-center justify-between transition-all hover:brightness-110"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.06))",
            border: "1px solid rgba(239,68,68,0.4)",
            boxShadow: "0 0 14px rgba(239,68,68,0.15), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: "#ef4444" }} />
            <span className="text-[12px] font-bold tracking-wider text-white">MAYDAY</span>
          </div>
          <span className="text-[9px] font-mono" style={{ color: "#f87171" }}>LUNAR · tap to raise</span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0"
              style={{ background: "rgba(239,68,68,0.18)", backdropFilter: "blur(8px)" }}
              onClick={() => setOpen(false)}
            />
            <motion.form
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 32 }}
              onSubmit={(e) => { e.preventDefault(); submit(); }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-t-2xl md:rounded-2xl p-5"
              style={{
                background: "linear-gradient(180deg, rgba(239,68,68,0.25), rgba(12,0,0,0.95))",
                border: "2px solid #ef4444",
                boxShadow: "0 -16px 60px rgba(239,68,68,0.4)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={20} style={{ color: "#fff" }} />
                  <h2 className="text-[18px] font-bold tracking-wider text-white">MAYDAY · LUNAR</h2>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/[0.05]">
                  <X size={16} style={{ color: "#fecaca" }} />
                </button>
              </div>

              <div className="space-y-2.5">
                <LunarField letter="L" label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
                <LunarField letter="U" label="Unit" value={unit} onChange={() => {}} readOnly />
                <LunarField letter="N" label="Name"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  options={[captain, ...members].filter(Boolean).map((m) => m!.name)}
                />
                <LunarField letter="A" label="Assignment / Air" value={form.assignment} onChange={(v) => setForm({ ...form, assignment: v })} hint={form.air_pressure} hintOnChange={(v) => setForm({ ...form, air_pressure: v })} />
                <LunarField letter="R" label="Resources needed" value={form.resources} onChange={(v) => setForm({ ...form, resources: v })} />
              </div>

              <button
                type="submit"
                className="w-full mt-5 py-4 rounded-xl text-[18px] font-bold tracking-[0.3em] text-white"
                style={{
                  background: "linear-gradient(180deg, #ef4444, #991b1b)",
                  boxShadow: "0 0 40px rgba(239,68,68,0.6), inset 0 1px 0 rgba(255,255,255,0.15)",
                  letterSpacing: "0.25em",
                }}
              >
                SEND MAYDAY
              </button>
              <div className="text-[9px] text-center mt-2" style={{ color: "#fecaca" }}>
                Broadcasts to dispatch · triggers RIT deployment · logs to incident timeline
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function LunarField({
  letter, label, value, onChange, options, readOnly, hint, hintOnChange,
}: {
  letter: string; label: string; value: string; onChange: (v: string) => void;
  options?: string[]; readOnly?: boolean; hint?: string; hintOnChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 text-[14px] font-bold" style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
        {letter}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "#fecaca" }}>{label}</div>
        {options ? (
          <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-1.5 rounded text-[12px] font-semibold" style={{ background: "rgba(0,0,0,0.35)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}>
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)} readOnly={readOnly}
            className="w-full px-3 py-1.5 rounded text-[12px] font-semibold outline-none"
            style={{ background: "rgba(0,0,0,0.35)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}
          />
        )}
        {hint !== undefined && hintOnChange && (
          <input value={hint} onChange={(e) => hintOnChange(e.target.value)}
            className="w-full mt-1 px-3 py-1 rounded text-[11px] outline-none"
            style={{ background: "rgba(0,0,0,0.25)", color: "#fecaca", border: "1px solid rgba(255,255,255,0.08)" }}
            placeholder="Air pressure (e.g. 1100 psi)"
          />
        )}
      </div>
    </div>
  );
}
