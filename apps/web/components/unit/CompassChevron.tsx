"use client";

import { Compass } from "lucide-react";

// Small compass chevron showing where the captain is relative to the member.
// Uses bearing and distance computed by SceneMiniMap.
export default function CompassChevron({
  bearingDeg, distanceM, alarm = false,
}: { bearingDeg: number; distanceM: number; alarm?: boolean }) {
  const color = alarm ? "#ef4444" : "#60a5fa";
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
      style={{
        background: "rgba(8,8,14,0.9)",
        border: `1px solid ${color}60`,
        boxShadow: `0 0 8px ${color}30`,
      }}
    >
      <div style={{ transform: `rotate(${bearingDeg}deg)`, transition: "transform 400ms ease", color }}>
        <Compass size={12} />
      </div>
      <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color }}>
        CAPT
      </span>
      <span className="text-[9px] font-mono tabular-nums" style={{ color: "#a1a1aa" }}>
        {distanceM}m
      </span>
    </div>
  );
}
