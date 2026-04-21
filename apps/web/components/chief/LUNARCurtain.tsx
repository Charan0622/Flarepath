"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useChief } from "@/lib/chief-store";
import type { CrewMember } from "@/lib/crew-data";

interface Props {
  open: boolean;
  onClose: () => void;
  unit: string;
  captain: CrewMember | null;
  members: CrewMember[];
}

// Full-screen LUNAR Mayday form curtain. Opens directly from the chief
// header's MAYDAY button — no intermediate tap-to-open slab.
export default function LUNARCurtain({ open, onClose, unit, captain, members }: Props) {
  const { raiseMayday } = useChief();
  const [form, setForm] = useState({
    badge: captain?.badge ?? "",
    name: captain?.name ?? "",
    location: "Side A · 2nd floor",
    assignment: "Attack line · low air",
    air_pressure: "1100 psi",
    resources: "RIT with thermal camera",
  });

  // Reset form when the captain changes (new dispatch)
  useEffect(() => {
    if (captain) {
      setForm((f) => ({ ...f, badge: f.badge || captain.badge, name: f.name || captain.name }));
    }
  }, [captain]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(239,68,68,0.18)", backdropFilter: "blur(10px)" }}
            onClick={onClose}
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
              background: "linear-gradient(180deg, rgba(239,68,68,0.25), rgba(12,0,0,0.96))",
              border: "2px solid #ef4444",
              boxShadow: "0 -16px 60px rgba(239,68,68,0.4)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  <AlertTriangle size={22} style={{ color: "#fff" }} />
                </motion.div>
                <h2 className="text-[20px] font-bold tracking-wider text-white">MAYDAY · LUNAR</h2>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-white/[0.08]">
                <X size={16} style={{ color: "#fecaca" }} />
              </button>
            </div>

            <div className="space-y-2.5">
              <Field letter="L" label="Location"
                value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
              <Field letter="U" label="Unit" value={unit} onChange={() => {}} readOnly />
              <Field letter="N" label="Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                options={[captain, ...members].filter(Boolean).map((m) => m!.name)}
              />
              <Field letter="A" label="Assignment / Air"
                value={form.assignment}
                onChange={(v) => setForm({ ...form, assignment: v })}
                hint={form.air_pressure}
                hintOnChange={(v) => setForm({ ...form, air_pressure: v })}
              />
              <Field letter="R" label="Resources needed"
                value={form.resources}
                onChange={(v) => setForm({ ...form, resources: v })} />
            </div>

            <button
              type="submit"
              className="w-full mt-5 py-4 rounded-xl text-[18px] font-bold text-white"
              style={{
                background: "linear-gradient(180deg, #ef4444, #991b1b)",
                boxShadow: "0 0 40px rgba(239,68,68,0.6), inset 0 1px 0 rgba(255,255,255,0.15)",
                letterSpacing: "0.25em",
              }}
            >
              SEND MAYDAY
            </button>
            <div className="text-[9px] text-center mt-2" style={{ color: "#fecaca" }}>
              Broadcasts to dispatch · triggers RIT deployment · logs to timeline · press <kbd className="px-1 rounded" style={{ background: "rgba(255,255,255,0.1)" }}>Esc</kbd> to cancel
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({
  letter, label, value, onChange, options, readOnly, hint, hintOnChange,
}: {
  letter: string; label: string; value: string; onChange: (v: string) => void;
  options?: string[]; readOnly?: boolean; hint?: string; hintOnChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 text-[14px] font-bold"
        style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.22)" }}>
        {letter}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "#fecaca" }}>{label}</div>
        {options ? (
          <select value={value} onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded text-[12px] font-semibold outline-none"
            style={{ background: "rgba(0,0,0,0.4)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}>
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)} readOnly={readOnly}
            className="w-full px-3 py-1.5 rounded text-[12px] font-semibold outline-none"
            style={{ background: "rgba(0,0,0,0.4)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }} />
        )}
        {hint !== undefined && hintOnChange && (
          <input value={hint} onChange={(e) => hintOnChange(e.target.value)}
            className="w-full mt-1 px-3 py-1 rounded text-[11px] outline-none"
            style={{ background: "rgba(0,0,0,0.3)", color: "#fecaca", border: "1px solid rgba(255,255,255,0.1)" }}
            placeholder="Air pressure (e.g. 1100 psi)" />
        )}
      </div>
    </div>
  );
}
