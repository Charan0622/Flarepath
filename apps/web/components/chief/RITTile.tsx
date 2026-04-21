"use client";

import { ShieldCheck, AlertCircle } from "lucide-react";
import type { CrewMember } from "@/lib/crew-data";
import { useChief } from "@/lib/chief-store";

export default function RITTile({ members }: { members: CrewMember[] }) {
  const { state } = useChief();
  const ritAssigned = state.assignments.filter((a) => a.position === "rit");
  const interiorCount = state.assignments.filter((a) => a.position === "attack" || a.position === "search").length;
  const compliant = ritAssigned.length >= 2 || interiorCount === 0;

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: compliant ? "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))" : "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.03))",
        border: `1px solid ${compliant ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.35)"}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {compliant ? <ShieldCheck size={12} style={{ color: "#22c55e" }} /> : <AlertCircle size={12} style={{ color: "#ef4444" }} />}
          <span className="text-[11px] font-semibold text-white">Rapid Intervention</span>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{
          background: compliant ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          color: compliant ? "#22c55e" : "#ef4444",
        }}>
          {compliant ? "✓ NFPA 1407" : "! 2-in/2-out breach"}
        </span>
      </div>

      <div className="text-[10px] mb-2" style={{ color: "#a1a1aa" }}>
        {ritAssigned.length}/2 staged · {interiorCount} interior
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {ritAssigned.length === 0 ? (
          <span className="text-[9.5px] italic" style={{ color: "#71717a" }}>Assign RIT from crew constellation</span>
        ) : (
          ritAssigned.map((a) => {
            const m = members.find((x) => x.badge === a.badge);
            return m ? (
              <span key={a.badge} className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
                {m.name.split(" ")[0]}
              </span>
            ) : null;
          })
        )}
      </div>
    </div>
  );
}
