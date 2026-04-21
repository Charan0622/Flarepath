"use client";

import { useState } from "react";
import {
  Star, Shield, X, ArrowUp, Trash2, Edit3, Check,
  Radio as RadioIcon, Building2, UserPlus, Users,
} from "lucide-react";
import { useCrew, type Shift } from "@/lib/crew-store";
import type { CrewMember } from "@/lib/crew-data";
import { DRAG_MIME } from "./PersonnelPool";

interface Props {
  callSign: string | null;
}

const SHIFTS: Shift[] = ["A", "B", "C"];

export default function UnitEditor({ callSign }: Props) {
  const { state, removeMember, promoteCaptain, deleteUnit, renameUnit, updateUnitMeta, addMember } = useCrew();
  const unit = callSign ? state.units[callSign] : null;

  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", rank: "Firefighter", badge: "", years: 0 });
  const [rosterDrag, setRosterDrag] = useState(false);

  if (!unit) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-8">
          <Users size={22} className="mx-auto mb-3" style={{ color: "#52525b" }} />
          <p className="text-[13px] font-semibold text-white mb-1">Select a unit</p>
          <p className="text-[11px]" style={{ color: "#71717a" }}>
            Pick a unit from the list to edit its roster, swap captains, or rename it.
          </p>
        </div>
      </div>
    );
  }

  const totalCrew = 1 + unit.members.length;

  function startRename() {
    setNewName(unit!.callSign);
    setRenaming(true);
  }

  function commitRename() {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== unit!.callSign) {
      renameUnit(unit!.callSign, trimmed);
    }
    setRenaming(false);
  }

  function addFreshMember() {
    if (!form.name.trim() || !form.badge.trim()) return;
    addMember(unit!.callSign, {
      name: form.name.trim(),
      rank: form.rank,
      badge: form.badge.trim(),
      years: Number(form.years) || 0,
    });
    setForm({ name: "", rank: "Firefighter", badge: "", years: 0 });
    setAdding(false);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Unit header */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {renaming ? (
              <>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }}
                  className="text-[18px] font-bold bg-transparent outline-none border-b text-white"
                  style={{ borderColor: "#ef4444" }}
                />
                <button onClick={commitRename} className="p-1 rounded hover:bg-white/[0.05]"><Check size={14} style={{ color: "#22c55e" }} /></button>
              </>
            ) : (
              <>
                <h2 className="text-[18px] font-bold text-white tracking-tight">{unit.callSign}</h2>
                <button onClick={startRename} className="p-1 rounded hover:bg-white/[0.05]" title="Rename unit">
                  <Edit3 size={12} style={{ color: "#71717a" }} />
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => { if (confirm(`Delete ${unit.callSign}? All members return to the personnel pool.`)) deleteUnit(unit.callSign); }}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-white/[0.05]"
            style={{ color: "#ef4444" }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[11px]">
          <span className="capitalize" style={{ color: "#a1a1aa" }}>{unit.type}</span>
          <span style={{ color: "#52525b" }}>·</span>
          <span style={{ color: "#a1a1aa" }}>{totalCrew} crew</span>
          <span style={{ color: "#52525b" }}>·</span>
          <span style={{ color: "#a1a1aa" }}>Shift {unit.shift}</span>
          <span style={{ color: "#52525b" }}>·</span>
          <span className="font-mono" style={{ color: "#a1a1aa" }}>{unit.radio_channel}</span>
        </div>
      </div>

      {/* Meta editors */}
      <div className="grid grid-cols-3 gap-px" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <MetaField
          icon={RadioIcon}
          label="Radio"
          value={unit.radio_channel}
          onChange={(v) => updateUnitMeta(unit.callSign, { radio_channel: v })}
        />
        <MetaField
          icon={Building2}
          label="Station"
          value={unit.station ?? ""}
          onChange={(v) => updateUnitMeta(unit.callSign, { station: v })}
          placeholder="Assign station…"
        />
        <div className="px-3 py-2 flex flex-col gap-1" style={{ background: "#0a0a0e" }}>
          <div className="text-[9px] uppercase tracking-wider" style={{ color: "#71717a" }}>Shift</div>
          <div className="flex gap-1">
            {SHIFTS.map((s) => (
              <button
                key={s}
                onClick={() => updateUnitMeta(unit.callSign, { shift: s })}
                className="flex-1 text-[11px] font-semibold rounded py-1 transition-colors"
                style={{
                  background: unit.shift === s ? "#ef4444" : "rgba(255,255,255,0.04)",
                  color: unit.shift === s ? "#fff" : "#a1a1aa",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Roster — also a drop target for pool members */}
      <div
        className="flex-1 overflow-auto p-4 space-y-2 relative transition-colors"
        style={{
          background: rosterDrag ? "rgba(34,197,94,0.05)" : "transparent",
          outline: rosterDrag ? "1px dashed rgba(34,197,94,0.5)" : "none",
          outlineOffset: "-10px",
        }}
        onDragEnter={(e) => {
          if (e.dataTransfer.types.includes(DRAG_MIME)) {
            e.preventDefault();
            setRosterDrag(true);
          }
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DRAG_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }
        }}
        onDragLeave={(e) => {
          // Only clear if leaving the container, not moving between children
          if (e.currentTarget === e.target) setRosterDrag(false);
        }}
        onDrop={(e) => {
          const raw = e.dataTransfer.getData(DRAG_MIME);
          setRosterDrag(false);
          if (!raw || !unit) return;
          e.preventDefault();
          try {
            const member = JSON.parse(raw) as CrewMember;
            if (member?.badge && member?.name) addMember(unit.callSign, member, true);
          } catch {}
        }}
      >
        {/* Captain */}
        <div
          className="rounded-lg p-3"
          style={{ background: "linear-gradient(135deg, rgba(234,179,8,0.08), rgba(234,179,8,0.02))", border: "1px solid rgba(234,179,8,0.25)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(234,179,8,0.2)", border: "1px solid rgba(234,179,8,0.4)" }}>
                <Star size={13} fill="#eab308" stroke="#eab308" />
              </div>
              <div className="min-w-0">
                {unit.captain ? (
                  <>
                    <div className="text-[12px] font-semibold text-white truncate">{unit.captain.name}</div>
                    <div className="text-[10px]" style={{ color: "#eab308" }}>
                      {unit.captain.rank} · Unit Leader
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] italic" style={{ color: "#71717a" }}>Promote a member to captain</div>
                )}
              </div>
            </div>
            {unit.captain && (
              <div className="text-right shrink-0">
                <div className="text-[9px] font-mono" style={{ color: "#a1a1aa" }}>{unit.captain.badge}</div>
                <div className="text-[9px]" style={{ color: "#71717a" }}>{unit.captain.years}y</div>
              </div>
            )}
          </div>
          {unit.captain?.certifications?.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {unit.captain.certifications.map((c) => (
                <span key={c} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(234,179,8,0.12)", color: "#eab308" }}>{c}</span>
              ))}
            </div>
          ) : null}
        </div>

        {/* Members */}
        {unit.members.map((m) => (
          <div
            key={m.badge}
            className="rounded-lg p-2.5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Shield size={11} style={{ color: "#a1a1aa" }} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-white truncate">{m.name}</div>
                  <div className="text-[10px]" style={{ color: "#a1a1aa" }}>{m.rank}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[9px] font-mono" style={{ color: "#71717a" }}>{m.badge}</span>
                <button
                  onClick={() => promoteCaptain(unit.callSign, m.badge)}
                  title="Promote to captain"
                  className="p-1 rounded hover:bg-white/[0.05]"
                  style={{ color: "#eab308" }}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => removeMember(unit.callSign, m.badge, true)}
                  title="Remove from unit"
                  className="p-1 rounded hover:bg-white/[0.05]"
                  style={{ color: "#ef4444" }}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
            {m.certifications?.length ? (
              <div className="mt-1.5 flex flex-wrap gap-1 pl-9">
                {m.certifications.map((c) => (
                  <span key={c} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#a1a1aa" }}>{c}</span>
                ))}
              </div>
            ) : null}
          </div>
        ))}

        {/* Add new (manual) */}
        {adding ? (
          <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.25)" }}>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="col-span-2 rounded px-2 py-1.5 text-[12px] bg-white/[0.04] text-white placeholder-[#52525b] outline-none border border-white/[0.08] focus:border-[#22c55e]" />
              <select value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} className="rounded px-2 py-1.5 text-[12px] bg-white/[0.04] text-white outline-none border border-white/[0.08]">
                {["Firefighter", "Firefighter/Paramedic", "Engineer", "Rescue Technician", "Captain"].map((r) => <option key={r}>{r}</option>)}
              </select>
              <input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Badge (SJ-0000)" className="rounded px-2 py-1.5 text-[11px] font-mono bg-white/[0.04] text-white placeholder-[#52525b] outline-none border border-white/[0.08]" />
              <input type="number" min="0" value={form.years} onChange={(e) => setForm({ ...form, years: Number(e.target.value) })} placeholder="Years" className="col-span-2 rounded px-2 py-1.5 text-[11px] bg-white/[0.04] text-white placeholder-[#52525b] outline-none border border-white/[0.08]" />
            </div>
            <div className="flex gap-2">
              <button onClick={addFreshMember} className="flex-1 rounded px-3 py-1.5 text-[11px] font-semibold text-[#04140c]" style={{ background: "#22c55e" }}>Add</button>
              <button onClick={() => setAdding(false)} className="rounded px-3 py-1.5 text-[11px] border border-white/[0.08]" style={{ color: "#a1a1aa" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full rounded-lg py-2 text-[11px] flex items-center justify-center gap-1.5 transition-colors"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px dashed rgba(34,197,94,0.35)", color: "#22c55e" }}
          >
            <UserPlus size={12} />
            Add new firefighter
          </button>
        )}
      </div>
    </div>
  );
}

function MetaField({
  icon: Icon, label, value, onChange, placeholder,
}: { icon: typeof Star; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="px-3 py-2 flex flex-col gap-1" style={{ background: "#0a0a0e" }}>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider" style={{ color: "#71717a" }}>
        <Icon size={9} />
        <span>{label}</span>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent outline-none text-[12px] font-medium text-white placeholder-[#52525b] w-full"
      />
    </div>
  );
}
