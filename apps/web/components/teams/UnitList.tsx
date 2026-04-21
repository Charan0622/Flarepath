"use client";

import { useState } from "react";
import { Flame, Star, Plus, Sparkles } from "lucide-react";
import { useCrew, type Unit } from "@/lib/crew-store";
import type { CrewMember } from "@/lib/crew-data";
import { DRAG_MIME } from "./PersonnelPool";

const TYPE_COLOR: Record<string, string> = {
  engine: "#ef4444",
  ladder: "#f97316",
  tanker: "#eab308",
  rescue: "#22c55e",
  ambulance: "#3b82f6",
  custom: "#a855f7",
};

interface Props {
  selected: string | null;
  onSelect: (callSign: string) => void;
  onNew: () => void;
}

export default function UnitList({ selected, onSelect, onNew }: Props) {
  const { state, addMember } = useCrew();
  const units = Object.values(state.units).sort((a, b) => a.callSign.localeCompare(b.callSign));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2">
          <Flame size={13} style={{ color: "#a1a1aa" }} />
          <span className="text-[12px] font-semibold text-white">Units</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded tabular-nums" style={{ background: "rgba(255,255,255,0.05)", color: "#a1a1aa" }}>
            {units.length}
          </span>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:brightness-110"
          style={{ background: "#a855f7" }}
        >
          <Plus size={11} />
          New
        </button>
      </div>

      <div className="flex-1 overflow-auto py-2">
        {units.map((u) => (
          <UnitRow
            key={u.callSign}
            unit={u}
            active={u.callSign === selected}
            onClick={() => onSelect(u.callSign)}
            onDropMember={(m) => addMember(u.callSign, m, true)}
          />
        ))}
      </div>
    </div>
  );
}

function UnitRow({
  unit, active, onClick, onDropMember,
}: { unit: Unit; active: boolean; onClick: () => void; onDropMember: (m: CrewMember) => void }) {
  const color = TYPE_COLOR[unit.type] ?? "#71717a";
  const count = 1 + unit.members.length;
  const [dragOver, setDragOver] = useState(false);

  return (
    <button
      onClick={onClick}
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        const raw = e.dataTransfer.getData(DRAG_MIME);
        setDragOver(false);
        if (!raw) return;
        e.preventDefault();
        try {
          const member = JSON.parse(raw) as CrewMember;
          if (member?.badge && member?.name) onDropMember(member);
        } catch {}
      }}
      className="w-full text-left px-3 py-2.5 transition-all hover:bg-white/[0.03]"
      style={{
        background: dragOver ? "rgba(34,197,94,0.12)" : active ? "rgba(239,68,68,0.06)" : "transparent",
        borderLeft: `3px solid ${dragOver ? "#22c55e" : active ? "#ef4444" : "transparent"}`,
        outline: dragOver ? "1px dashed rgba(34,197,94,0.5)" : "none",
        outlineOffset: "-4px",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-[12px] font-semibold text-white truncate">{unit.callSign}</span>
          {unit.isCustom && <Sparkles size={10} style={{ color: "#a855f7" }} />}
        </div>
        <span className="text-[10px] tabular-nums shrink-0" style={{ color: dragOver ? "#22c55e" : "#71717a" }}>
          {dragOver ? "+1" : count}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-0.5 text-[10px]" style={{ color: "#71717a" }}>
        {unit.captain ? (
          <>
            <Star size={9} style={{ color: "#eab308" }} fill="#eab308" />
            <span className="truncate">{unit.captain.name}</span>
          </>
        ) : (
          <span className="italic" style={{ color: "#52525b" }}>No captain assigned</span>
        )}
        <span className="ml-auto font-mono" style={{ color: "#52525b" }}>{unit.radio_channel}</span>
      </div>
    </button>
  );
}
