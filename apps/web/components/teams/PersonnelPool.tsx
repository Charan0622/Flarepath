"use client";

import { useState } from "react";
import { Users, UserPlus, ChevronRight, Search, GripVertical } from "lucide-react";
import { useCrew } from "@/lib/crew-store";
import type { CrewMember } from "@/lib/crew-data";

export const DRAG_MIME = "application/x-flarepath-member";

interface Props {
  targetUnit: string | null;
}

export default function PersonnelPool({ targetUnit }: Props) {
  const { state, addMember, addToPool } = useCrew();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", rank: "Firefighter", badge: "", years: 0 });

  const filtered = state.pool.filter(
    (p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.badge.includes(q) || p.rank.toLowerCase().includes(q.toLowerCase())
  );

  function submitNew() {
    if (!form.name.trim() || !form.badge.trim()) return;
    addToPool({ name: form.name.trim(), rank: form.rank, badge: form.badge.trim(), years: Number(form.years) || 0 });
    setForm({ name: "", rank: "Firefighter", badge: "", years: 0 });
    setAdding(false);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={13} style={{ color: "#a1a1aa" }} />
            <span className="text-[12px] font-semibold text-white">Personnel Pool</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded tabular-nums" style={{ background: "rgba(255,255,255,0.05)", color: "#a1a1aa" }}>
              {state.pool.length}
            </span>
          </div>
          <button
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
            style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}
          >
            <UserPlus size={11} />
            Hire
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2 px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <Search size={11} style={{ color: "#71717a" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, badge, rank…"
            className="bg-transparent outline-none text-[11px] text-white placeholder-[#52525b] flex-1"
          />
        </div>
      </div>

      {adding && (
        <div className="px-3 pt-3 space-y-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="w-full rounded px-2 py-1.5 text-[12px] bg-white/[0.04] text-white placeholder-[#52525b] outline-none border border-white/[0.08]" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} className="rounded px-2 py-1.5 text-[11px] bg-white/[0.04] text-white outline-none border border-white/[0.08]">
              {["Firefighter", "Firefighter/Paramedic", "Engineer", "Rescue Technician", "Captain"].map((r) => <option key={r}>{r}</option>)}
            </select>
            <input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Badge" className="rounded px-2 py-1.5 text-[11px] font-mono bg-white/[0.04] text-white placeholder-[#52525b] outline-none border border-white/[0.08]" />
          </div>
          <input type="number" min="0" value={form.years} onChange={(e) => setForm({ ...form, years: Number(e.target.value) })} placeholder="Years of service" className="w-full rounded px-2 py-1.5 text-[11px] bg-white/[0.04] text-white placeholder-[#52525b] outline-none border border-white/[0.08]" />
          <div className="flex gap-2">
            <button onClick={submitNew} className="flex-1 rounded px-3 py-1.5 text-[11px] font-semibold text-[#04140c]" style={{ background: "#22c55e" }}>Add to pool</button>
            <button onClick={() => setAdding(false)} className="rounded px-3 py-1.5 text-[11px] border border-white/[0.08]" style={{ color: "#a1a1aa" }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-2 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-[11px]" style={{ color: "#71717a" }}>
              {q ? "No matches" : "Pool is empty — everyone is assigned."}
            </p>
          </div>
        ) : (
          filtered.map((p) => <PoolItem key={p.badge} member={p} targetUnit={targetUnit} addMember={addMember} />)
        )}
      </div>

      <div className="px-4 py-2 text-[10px] flex items-center gap-1.5" style={{ background: "rgba(59,130,246,0.06)", color: "#93c5fd", borderTop: "1px solid rgba(59,130,246,0.2)" }}>
        <GripVertical size={10} />
        <span>Drag anyone onto a unit, or click Assign to add to the selected one.</span>
      </div>
    </div>
  );
}

function PoolItem({
  member, targetUnit, addMember,
}: { member: CrewMember; targetUnit: string | null; addMember: (unit: string, m: CrewMember, fromPool?: boolean) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(DRAG_MIME, JSON.stringify(member));
        e.dataTransfer.setData("text/plain", `${member.name} · ${member.badge}`);
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className="rounded-lg p-2.5 flex items-center gap-2 transition-all hover:bg-white/[0.04] select-none"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        opacity: dragging ? 0.4 : 1,
        cursor: "grab",
      }}
    >
      <GripVertical size={12} style={{ color: "#52525b" }} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium text-white truncate">{member.name}</div>
        <div className="flex items-center gap-2 text-[10px]" style={{ color: "#a1a1aa" }}>
          <span>{member.rank}</span>
          <span style={{ color: "#52525b" }}>·</span>
          <span className="font-mono">{member.badge}</span>
          <span style={{ color: "#52525b" }}>·</span>
          <span>{member.years}y</span>
        </div>
      </div>
      <button
        disabled={!targetUnit}
        onClick={() => targetUnit && addMember(targetUnit, member, true)}
        title={targetUnit ? `Assign to ${targetUnit}` : "Select a unit first"}
        className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold transition-colors shrink-0"
        style={{
          background: targetUnit ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
          color: targetUnit ? "#ef4444" : "#52525b",
          cursor: targetUnit ? "pointer" : "not-allowed",
        }}
      >
        Assign <ChevronRight size={10} />
      </button>
    </div>
  );
}
