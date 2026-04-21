"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Mic, MapPin, X, Check } from "lucide-react";
import { useMember } from "@/lib/member-store";
import { getPrePlan } from "@/lib/chief-data";

interface Props {
  incidentAddress: string;
  incidentCoords: [number, number] | null;
}

// Evidence capture — one-tap photo w/ auto geotag, one-tap voice note,
// plus a collapsible pre-plan snippet drawer.
export default function EvidenceCapture({ incidentAddress, incidentCoords }: Props) {
  const { trail } = useMember();
  const [photoCount, setPhotoCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [recording, setRecording] = useState(false);
  const [prePlanOpen, setPrePlanOpen] = useState(false);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prePlan = getPrePlan(incidentAddress);

  function capturePhoto() {
    setPhotoCount((c) => c + 1);
    trail("photo_captured", {
      ts: new Date().toISOString(),
      coords: incidentCoords ?? null,
      address: incidentAddress.split(",")[0],
    });
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
  }

  function startRecording() {
    setRecording(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20);
    recordTimer.current = setTimeout(() => {
      setRecording(false);
      setNoteCount((c) => c + 1);
      trail("voice_note_saved", { seconds: 6 });
    }, 6000);
  }

  function cancelRecording() {
    if (recordTimer.current) clearTimeout(recordTimer.current);
    setRecording(false);
  }

  return (
    <div className="mx-3 space-y-3">
      <div className="flex items-center gap-1.5 px-1">
        <Camera size={11} style={{ color: "#a855f7" }} />
        <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#a1a1aa" }}>Evidence · Pre-Plan</span>
      </div>

      {/* Capture buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={capturePhoto}
          className="relative rounded-xl p-3 flex items-center gap-2 transition-transform active:scale-95"
          style={{
            background: "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(168,85,247,0.04))",
            border: "1px solid rgba(168,85,247,0.4)",
            minHeight: 56,
          }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(168,85,247,0.25)", border: "1px solid rgba(168,85,247,0.5)" }}>
            <Camera size={17} style={{ color: "#c4b5fd" }} />
          </div>
          <div className="min-w-0 text-left">
            <div className="text-[12px] font-bold text-white">Capture Photo</div>
            <div className="text-[9px] flex items-center gap-1" style={{ color: "#a1a1aa" }}>
              <MapPin size={8} /> auto-geotag
            </div>
          </div>
          {photoCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: "#a855f7", color: "#fff" }}>
              {photoCount}
            </span>
          )}
        </button>

        <button
          onPointerDown={startRecording}
          onPointerUp={cancelRecording}
          onPointerLeave={cancelRecording}
          className="relative rounded-xl p-3 flex items-center gap-2 transition-transform active:scale-95"
          style={{
            background: recording
              ? "linear-gradient(135deg, rgba(239,68,68,0.35), rgba(239,68,68,0.1))"
              : "linear-gradient(135deg, rgba(168,85,247,0.14), rgba(168,85,247,0.03))",
            border: `1px solid ${recording ? "rgba(239,68,68,0.55)" : "rgba(168,85,247,0.35)"}`,
            minHeight: 56,
            boxShadow: recording ? "0 0 16px rgba(239,68,68,0.5)" : "none",
          }}
        >
          <motion.div
            animate={recording ? { scale: [1, 1.18, 1] } : { scale: 1 }}
            transition={{ duration: 0.7, repeat: recording ? Infinity : 0 }}
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: recording ? "rgba(239,68,68,0.35)" : "rgba(168,85,247,0.2)", border: `1px solid ${recording ? "rgba(239,68,68,0.7)" : "rgba(168,85,247,0.45)"}` }}
          >
            <Mic size={17} style={{ color: recording ? "#fecaca" : "#c4b5fd" }} />
          </motion.div>
          <div className="min-w-0 text-left">
            <div className="text-[12px] font-bold text-white">{recording ? "Recording…" : "Voice Note"}</div>
            <div className="text-[9px]" style={{ color: recording ? "#fecaca" : "#a1a1aa" }}>
              {recording ? "release to save" : "hold · Whisper transcribe"}
            </div>
          </div>
          {!recording && noteCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: "#a855f7", color: "#fff" }}>
              {noteCount}
            </span>
          )}
        </button>
      </div>

      {/* Pre-plan snippet */}
      {prePlan && (
        <button
          onClick={() => setPrePlanOpen((o) => !o)}
          className="w-full rounded-xl px-3 py-2.5 flex items-center justify-between text-left"
          style={{
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.25)",
          }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "#60a5fa" }}>Pre-Incident Plan</div>
            <div className="text-[12px] font-semibold text-white mt-0.5 truncate">{prePlan.occupancy}</div>
          </div>
          <span className="text-[10px] font-mono tabular-nums" style={{ color: "#a1a1aa" }}>
            {prePlanOpen ? "hide" : "open"}
          </span>
        </button>
      )}

      <AnimatePresence>
        {prePlanOpen && prePlan && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-xl p-3 text-[11px] space-y-1.5" style={{ color: "#d4d4d8" }}>
              <Row label="Construction" value={prePlan.construction} />
              <Row label="Floors" value={String(prePlan.floor_count)} />
              <Row label="Occupants" value={`~${prePlan.occupants_typical}`} />
              <Row label="Standpipe" value={prePlan.standpipe ? "Yes" : "No"} />
              <Row label="Sprinklers" value={prePlan.sprinklers ? "Yes" : "No"} />
              <Row label="Knox-box" value={prePlan.knox_box} />
              {prePlan.hazards.length > 0 && (
                <div className="pt-1.5 mt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "#f97316" }}>Hazards</div>
                  <div className="flex flex-wrap gap-1">
                    {prePlan.hazards.map((h) => (
                      <span key={h} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {prePlan.notes && (
                <div className="pt-1.5 mt-1.5 italic text-[10px]" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "#a1a1aa" }}>
                  {prePlan.notes}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-20 text-[9px] uppercase tracking-wider shrink-0 pt-0.5" style={{ color: "#71717a" }}>{label}</span>
      <span className="flex-1">{value}</span>
    </div>
  );
}
