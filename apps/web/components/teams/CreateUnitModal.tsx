"use client";

import { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { useCrew, UNIT_TYPES, type Shift, type UnitType } from "@/lib/crew-store";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (callSign: string) => void;
}

export default function CreateUnitModal({ open, onClose, onCreated }: Props) {
  const { state, createUnit } = useCrew();
  const [name, setName] = useState("");
  const [type, setType] = useState<UnitType>("custom");
  const [shift, setShift] = useState<Shift>("A");
  const [channel, setChannel] = useState("TAC-5");
  const [station, setStation] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) { setErr("Name is required"); return; }
    if (state.units[trimmed]) { setErr("A unit with that name already exists"); return; }
    createUnit({
      callSign: trimmed,
      displayName: trimmed,
      type,
      shift,
      radio_channel: channel.trim() || "TAC-5",
      station: station.trim() || undefined,
      captain: null,
      members: [],
      isCustom: true,
    });
    onCreated(trimmed);
    setName(""); setType("custom"); setShift("A"); setChannel("TAC-5"); setStation(""); setErr(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border shadow-2xl" style={{ background: "#0a0a0e", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: "#a855f7" }} />
            <h3 className="text-[14px] font-semibold text-white">Create Custom Unit</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/[0.05]" style={{ color: "#71717a" }}><X size={14} /></button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "#71717a" }}>Unit Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setErr(null); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. Strike Team Alpha"
              className="w-full rounded px-3 py-2 text-[13px] bg-white/[0.04] text-white placeholder-[#52525b] outline-none border border-white/[0.08] focus:border-[#a855f7]"
            />
            {err && <p className="mt-1 text-[10px]" style={{ color: "#ef4444" }}>{err}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "#71717a" }}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as UnitType)} className="w-full rounded px-2 py-2 text-[12px] bg-white/[0.04] text-white outline-none border border-white/[0.08] capitalize">
                {UNIT_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "#71717a" }}>Shift</label>
              <div className="flex gap-1">
                {(["A", "B", "C"] as Shift[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setShift(s)}
                    className="flex-1 rounded py-2 text-[11px] font-semibold transition-colors"
                    style={{ background: shift === s ? "#a855f7" : "rgba(255,255,255,0.04)", color: shift === s ? "#fff" : "#a1a1aa" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "#71717a" }}>Radio Channel</label>
              <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="TAC-5" className="w-full rounded px-3 py-2 text-[12px] font-mono bg-white/[0.04] text-white placeholder-[#52525b] outline-none border border-white/[0.08]" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "#71717a" }}>Station (optional)</label>
              <input value={station} onChange={(e) => setStation(e.target.value)} placeholder="SJFD Station 1" className="w-full rounded px-3 py-2 text-[12px] bg-white/[0.04] text-white placeholder-[#52525b] outline-none border border-white/[0.08]" />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onClose} className="text-[11px] px-3 py-1.5 rounded border border-white/[0.08]" style={{ color: "#a1a1aa" }}>Cancel</button>
          <button onClick={submit} className="text-[11px] px-4 py-1.5 rounded font-semibold text-white" style={{ background: "#a855f7" }}>Create Unit</button>
        </div>
      </div>
    </div>
  );
}
