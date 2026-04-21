"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useMember } from "@/lib/member-store";
import { synthesizeBiometric } from "@/lib/chief-data";

interface Props {
  open: boolean;
  onClose: () => void;
  memberBadge: string | null;
  memberName: string;
  unit: string;
}

// Member's personal MAYDAY trigger — LUNAR-scaffolded, mostly pre-filled
// from live biometrics, voice-confirmed, one big send button.
export default function MemberMaydayCurtain({ open, onClose, memberBadge, memberName, unit }: Props) {
  const { raiseMayday } = useMember();
  const bio = memberBadge ? synthesizeBiometric(memberBadge, "interior") : null;
  const [form, setForm] = useState({
    location: "Interior · Div-A · 2nd floor",
    assignment: "Attack line",
    air_pressure: bio ? `${bio.air_psi} psi` : "—",
    resources: "RIT with thermal camera",
  });

  useEffect(() => {
    if (bio) setForm((f) => ({ ...f, air_pressure: `${bio.air_psi} psi` }));
  }, [bio?.air_psi]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function submit() {
    raiseMayday({
      ...form,
      raised_at: new Date().toISOString(),
      resolved_at: null,
    });
    // Strong haptic (triple buzz)
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([120, 60, 120, 60, 200]);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(239,68,68,0.25)", backdropFilter: "blur(12px)" }}
            onClick={onClose}
          />
          <motion.form
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-t-3xl p-5 pb-8"
            style={{
              background: "linear-gradient(180deg, rgba(239,68,68,0.3), rgba(8,0,0,0.98))",
              border: "2px solid #ef4444",
              boxShadow: "0 -20px 80px rgba(239,68,68,0.5)",
            }}
          >
            <div className="w-12 h-1 rounded-full mx-auto mb-3" style={{ background: "rgba(255,255,255,0.2)" }} />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>
                  <AlertTriangle size={24} style={{ color: "#fff" }} />
                </motion.div>
                <h2 className="text-[22px] font-bold tracking-wider text-white">MAYDAY · LUNAR</h2>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded hover:bg-white/[0.08]">
                <X size={18} style={{ color: "#fecaca" }} />
              </button>
            </div>

            <div className="space-y-3">
              <F letter="L" label="Location"         value={form.location}    onChange={(v) => setForm({ ...form, location: v })} />
              <F letter="U" label="Unit"             value={unit}             onChange={() => {}} readOnly />
              <F letter="N" label="Name"             value={memberName}       onChange={() => {}} readOnly />
              <F letter="A" label="Air / Assignment" value={form.assignment}  onChange={(v) => setForm({ ...form, assignment: v })} hint={form.air_pressure} hintOnChange={(v) => setForm({ ...form, air_pressure: v })} />
              <F letter="R" label="Resources needed" value={form.resources}   onChange={(v) => setForm({ ...form, resources: v })} />
            </div>

            <button
              type="submit"
              className="w-full mt-5 py-5 rounded-xl text-[20px] font-bold text-white"
              style={{
                background: "linear-gradient(180deg, #ef4444, #991b1b)",
                boxShadow: "0 0 50px rgba(239,68,68,0.7), inset 0 1px 0 rgba(255,255,255,0.2)",
                letterSpacing: "0.28em",
              }}
            >
              SEND MAYDAY
            </button>
            <div className="text-[10px] text-center mt-2" style={{ color: "#fecaca" }}>
              Broadcasts to chief + dispatch · triggers RIT deployment · auto-pings GPS + air + HR
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function F({
  letter, label, value, onChange, readOnly, hint, hintOnChange,
}: {
  letter: string; label: string; value: string; onChange: (v: string) => void;
  readOnly?: boolean; hint?: string; hintOnChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-[16px] font-bold"
        style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.22)" }}>
        {letter}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "#fecaca" }}>{label}</div>
        <input value={value} onChange={(e) => onChange(e.target.value)} readOnly={readOnly}
          className="w-full px-3 py-2.5 rounded-lg text-[14px] font-semibold outline-none"
          style={{
            background: "rgba(0,0,0,0.45)", color: "#fff",
            border: "1px solid rgba(255,255,255,0.14)",
            minHeight: 44,
          }} />
        {hint !== undefined && hintOnChange && (
          <input value={hint} onChange={(e) => hintOnChange(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg text-[12px] outline-none"
            style={{ background: "rgba(0,0,0,0.35)", color: "#fecaca", border: "1px solid rgba(255,255,255,0.1)", minHeight: 40 }}
            placeholder="Air pressure" />
        )}
      </div>
    </div>
  );
}
