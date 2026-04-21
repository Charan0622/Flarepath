"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import type { CrewMember } from "@/lib/crew-data";
import { synthesizeBiometric } from "@/lib/chief-data";

// Crew radio-channel chips — illuminate when a firefighter keys up.
// Uses the same biometric synthesiser's radio_hot boolean.
export default function TacticalRadioStrip({ members, channel = "TAC-1" }: { members: CrewMember[]; channel?: string }) {
  const [, setTick] = useState(0);
  // 0.5 Hz is plenty — radio_hot flips on the order of seconds, and the chips
  // transition in CSS, so we don't need React renders faster than that.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="glass-card rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Radio size={12} style={{ color: "#3b82f6" }} />
          <span className="text-[11px] font-semibold text-white">Radio · {channel}</span>
        </div>
        <span className="text-[9px]" style={{ color: "#71717a" }}>tap to scrub last 30s</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {members.map((m) => {
          const bio = synthesizeBiometric(m.badge, "interior");
          return (
            <div
              key={m.badge}
              className="flex items-center gap-1 px-2 py-1 rounded text-[9.5px] font-semibold transition-all cursor-pointer"
              title={`${m.name} — ${bio.radio_hot ? "transmitting" : "silent"}`}
              style={{
                background: bio.radio_hot ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.03)",
                color: bio.radio_hot ? "#60a5fa" : "#a1a1aa",
                border: `1px solid ${bio.radio_hot ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.05)"}`,
                boxShadow: bio.radio_hot ? "0 0 10px rgba(59,130,246,0.35)" : "none",
              }}
            >
              <span className="w-1 h-1 rounded-full" style={{ background: bio.radio_hot ? "#60a5fa" : "rgba(255,255,255,0.2)" }} />
              {m.name.split(" ")[0]}
            </div>
          );
        })}
      </div>
    </div>
  );
}
