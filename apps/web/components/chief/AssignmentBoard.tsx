"use client";

import { Users } from "lucide-react";
import type { CrewMember } from "@/lib/crew-data";
import { useChief } from "@/lib/chief-store";
import { POSITIONS, TASKS } from "@/lib/chief-data";

export default function AssignmentBoard({ captain, members }: { captain: CrewMember | null; members: CrewMember[] }) {
  const { state } = useChief();
  const byPosition = new Map<string, CrewMember[]>();
  state.assignments.forEach((a) => {
    const m = members.find((x) => x.badge === a.badge);
    if (!m) return;
    const arr = byPosition.get(a.position) ?? [];
    arr.push(m);
    byPosition.set(a.position, arr);
  });

  return (
    <div className="glass-card rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Users size={12} style={{ color: "#3b82f6" }} />
          <span className="text-[11px] font-semibold text-white">ICS Positions</span>
        </div>
        <span className="text-[10px] tabular-nums" style={{ color: "#71717a" }}>
          {state.assignments.length} assigned
        </span>
      </div>

      <div className="space-y-1">
        {POSITIONS.map((p) => {
          const crew = byPosition.get(p.key) ?? [];
          const isIC = p.key === "ic";
          const icPerson = isIC ? captain : null;
          return (
            <div key={p.key} className="flex items-center gap-2 py-0.5">
              <div className="w-8 text-[9px] font-bold uppercase tracking-wider shrink-0 text-center" style={{ color: p.color }}>
                {p.short}
              </div>
              <div className="w-28 text-[10px] shrink-0" style={{ color: "#a1a1aa" }}>
                {p.label}
              </div>
              <div className="flex-1 flex items-center gap-1 flex-wrap">
                {isIC && icPerson ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}>
                    {icPerson.name.split(" ")[0]} {icPerson.name.split(" ").slice(-1).join(" ")[0]}.
                  </span>
                ) : crew.length === 0 ? (
                  <span className="text-[9px] italic" style={{ color: "#52525b" }}>—</span>
                ) : (
                  crew.map((m) => {
                    const assignment = state.assignments.find((a) => a.badge === m.badge);
                    const task = assignment && TASKS.find((t) => t.key === assignment.task);
                    return (
                      <span key={m.badge} className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                        style={{ background: `${task?.color ?? "#a1a1aa"}1a`, color: task?.color ?? "#a1a1aa" }}
                      >
                        {m.name.split(" ")[0]}
                        {task && <span className="text-[8px] opacity-70">·{task.short}</span>}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
