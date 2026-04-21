"use client";

import { Clock, Users, Eye, EyeOff, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useMember } from "@/lib/member-store";
import OrbitalStub from "./OrbitalStub";
import CompassChevron from "./CompassChevron";
import type { CrewMember } from "@/lib/crew-data";

interface Props {
  memberName: string;
  callSign: string;
  captain: CrewMember | null;
  members: CrewMember[];
  memberBadge: string | null;
  captainBearing: number | null;
  captainDistance: number | null;
  onPickBuddy: () => void;
  buddyName: string | null;
}

export default function MemberHeader({
  memberName, callSign, captain, members, memberBadge,
  captainBearing, captainDistance, onPickBuddy, buddyName,
}: Props) {
  const { state, toggleSmoke } = useMember();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="relative flex items-center justify-between gap-2 px-3 scanline-header"
      style={{ minHeight: 48, background: "rgba(8,8,14,0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Left: orbital stub (tap for chief's view) */}
      <div className="flex items-center gap-2 min-w-0">
        <OrbitalStub captain={captain} members={members} memberBadge={memberBadge} />
      </div>

      {/* Center: captain compass */}
      <div className="flex items-center">
        {captainBearing !== null && captainDistance !== null && (
          <CompassChevron bearingDeg={captainBearing} distanceM={captainDistance} alarm={captainDistance > 100} />
        )}
      </div>

      {/* Right: clock, smoke-mode, name */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onPickBuddy}
          className="px-1.5 py-1 rounded flex items-center gap-1 text-[9px] font-semibold"
          style={{
            background: buddyName ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
            color: buddyName ? "#22c55e" : "#a1a1aa",
            border: `1px solid ${buddyName ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.08)"}`,
          }}
          title="Set buddy partner (two-in/two-out)"
        >
          <Users size={10} />
          {buddyName ? buddyName.split(" ")[0] : "BUDDY"}
        </button>
        <button
          onClick={toggleSmoke}
          className="p-1.5 rounded"
          style={{
            background: state.smokeMode ? "rgba(255,255,255,0.1)" : "transparent",
            color: state.smokeMode ? "#fff" : "#71717a",
          }}
          title="Smoke-mode (high contrast)"
        >
          {state.smokeMode ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <div className="flex items-center gap-1 text-[10px] tabular-nums" style={{ color: "#a1a1aa" }}>
          <Clock size={10} />
          {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
        </div>
        <form action="/api/auth/logout" method="POST" className="flex">
          <button
            type="submit"
            title="Logout"
            aria-label="Logout"
            className="p-1.5 rounded hover:bg-white/[0.05]"
            style={{ color: "#71717a" }}
          >
            <LogOut size={13} />
          </button>
        </form>
      </div>
    </header>
  );
}
