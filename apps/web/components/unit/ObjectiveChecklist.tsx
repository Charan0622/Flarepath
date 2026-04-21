"use client";

import { Check, Hammer } from "lucide-react";
import { useMember } from "@/lib/member-store";
import { TASKS } from "@/lib/chief-data";

// Objective checklist tied to the member's current task. Each task has 3-4
// standard sub-steps. Tapping a step time-stamps it and logs back to trail.
const SUBSTEPS: Record<string, string[]> = {
  primary_search:   ["Entry point cleared", "Primary 'all clear'", "Hand off to 2° team"],
  secondary_search: ["Re-enter with thermal", "All spaces swept", "Report 'secondary complete'"],
  attack_line:      ["Line pulled and flaked", "Charged", "Advance to fire", "Fire knockdown"],
  vent_horizontal:  ["Windows identified", "Glass cleared", "Smoke lifted"],
  vent_vertical:    ["Roof access confirmed", "Cut line started", "Hole opened"],
  water_supply:     ["Hydrant connected", "Charged", "Residual pressure checked"],
  rit_standby:      ["2-in/2-out staged", "Tools & TIC ready", "Radio check with CMD"],
  salvage:          ["Contents covered", "Overhaul hot spots", "Structural walk"],
  medical:          ["Triage tags set", "Transport called", "Hand-off to EMS"],
  exterior_size_up: ["A-side clear", "B-side clear", "C-side clear", "D-side clear"],
};

export default function ObjectiveChecklist({ task }: { task: string | null }) {
  const { state, checkObjective } = useMember();
  const taskMeta = task ? TASKS.find((t) => t.key === task) : null;
  const steps = task ? (SUBSTEPS[task] ?? []) : [];

  if (!taskMeta) {
    return (
      <div className="mx-3 text-[11px] italic px-3 py-2" style={{ color: "#71717a" }}>
        Objectives appear when the captain assigns you a task.
      </div>
    );
  }

  const completedCount = steps.filter((_, i) => state.checklistCompleted[`${task}:${i}`]).length;

  return (
    <div className="mx-3">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Hammer size={11} style={{ color: taskMeta.color }} />
        <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#a1a1aa" }}>
          Objectives · {taskMeta.label}
        </span>
        <span className="ml-auto text-[10px] tabular-nums" style={{ color: "#71717a" }}>
          {completedCount}/{steps.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {steps.map((step, i) => {
          const key = `${task}:${i}`;
          const done = state.checklistCompleted[key];
          return (
            <button
              key={key}
              onClick={() => checkObjective(key)}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors"
              style={{
                background: done ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${done ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.06)"}`,
                minHeight: 44,
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: done ? "#22c55e" : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${done ? "#22c55e" : "rgba(255,255,255,0.14)"}`,
                }}
              >
                {done && <Check size={11} strokeWidth={3} style={{ color: "#04140c" }} />}
              </div>
              <span className={`text-[12px] ${done ? "line-through" : ""}`}
                style={{ color: done ? "#71717a" : "#e4e4e7" }}
              >
                {step}
              </span>
              {done && (
                <span className="ml-auto text-[9px] font-mono" style={{ color: "#52525b" }}>
                  {new Date(done).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
