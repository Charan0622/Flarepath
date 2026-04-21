"use client";

import { useEffect, useState } from "react";
import {
  LogOut, Clock, AlertCircle, CheckSquare,
  Shield, Radio,
} from "lucide-react";
import { useChief } from "@/lib/chief-store";
import type { CrewMember } from "@/lib/crew-data";

interface Props {
  callSignDisplay: string;
  callSignRaw: string;
  unitType: string;
  stationName: string | null;
  captain: CrewMember | null;
  radioChannel: string | null;
  onSceneAt: string | null;
  onOpenMayday: () => void;
  onRequestClose: () => void;
  maydayActive: boolean;
}

function fmtOnScene(ms: number | null): string {
  if (ms === null) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function ChiefHeader({
  callSignDisplay, callSignRaw, unitType, stationName,
  captain, radioChannel, onSceneAt,
  onOpenMayday, onRequestClose, maydayActive,
}: Props) {
  const { state, startPar, completePar } = useChief();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const onSceneMs = onSceneAt ? now - new Date(onSceneAt).getTime() : null;
  const activePar = state.parChecks.find((p) => !p.completed_at);

  return (
    <header
      className="relative flex items-center gap-4 px-4 glass-strip glass-divider-b scanline-header"
      style={{ height: 56 }}
    >
      {/* Left: page label (brand mark lives in the side rail) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col leading-none">
          <span className="text-[9px] font-medium uppercase tracking-[0.22em]" style={{ color: "#71717a" }}>
            Chief Console
          </span>
          <span className="text-[12px] font-semibold tracking-tight text-white mt-[3px]">On-scene command</span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.06)" }} />

      {/* Unit identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, rgba(234,179,8,0.2), rgba(234,179,8,0.04))",
            border: "1px solid rgba(234,179,8,0.4)",
            boxShadow: "0 0 14px rgba(234,179,8,0.18)",
          }}
        >
          <Shield size={15} style={{ color: "#eab308" }} />
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-white tracking-tight truncate">{callSignDisplay}</span>
            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: "rgba(234,179,8,0.14)", color: "#eab308" }}>
              {callSignRaw}
            </span>
            <span className="text-[10px] capitalize" style={{ color: "#a1a1aa" }}>{unitType}</span>
          </div>
          <span className="text-[10px] mt-0.5 flex items-center gap-1.5 truncate" style={{ color: "#71717a" }}>
            {captain ? (
              <>
                <span className="uppercase tracking-wider">CAPT</span>
                <span className="text-white font-semibold">{captain.name}</span>
                <span className="opacity-60 font-mono">· {captain.badge}</span>
              </>
            ) : <span className="italic">no captain</span>}
            {radioChannel && (
              <>
                <span style={{ color: "#52525b" }}>·</span>
                <Radio size={10} />
                <span className="font-mono">{radioChannel}</span>
              </>
            )}
            {stationName && (
              <>
                <span style={{ color: "#52525b" }}>·</span>
                <span>{stationName}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Flex spacer */}
      <div className="flex-1" />

      {/* Clock + on-scene */}
      <div className="flex items-center gap-3 text-[11px] tabular-nums shrink-0" style={{ color: "#a1a1aa" }}>
        <span className="flex items-center gap-1.5">
          <Clock size={11} />
          {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
        </span>
        {onSceneMs !== null && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: "#71717a" }}>on-scene</span>
            <span className="font-semibold text-white">{fmtOnScene(onSceneMs)}</span>
          </div>
        )}
      </div>

      {/* Control actions */}
      <div className="flex items-center gap-2 shrink-0">
        {activePar ? (
          <button
            onClick={completePar}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, rgba(234,179,8,0.25), rgba(234,179,8,0.1))",
              color: "#eab308", border: "1px solid rgba(234,179,8,0.4)",
            }}
          >
            <CheckSquare size={12} />
            Complete PAR · {activePar.responded.length}
          </button>
        ) : (
          <button
            onClick={startPar}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all hover:brightness-110"
            style={{
              background: "rgba(234,179,8,0.1)", color: "#eab308",
              border: "1px solid rgba(234,179,8,0.28)",
            }}
          >
            <AlertCircle size={12} />
            Call PAR
          </button>
        )}

        <button
          onClick={onOpenMayday}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider transition-all hover:brightness-110"
          style={{
            background: maydayActive
              ? "linear-gradient(135deg, #ef4444, #991b1b)"
              : "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))",
            color: maydayActive ? "#fff" : "#ef4444",
            border: "1px solid rgba(239,68,68,0.45)",
            boxShadow: maydayActive ? "0 0 18px rgba(239,68,68,0.6)" : "0 0 10px rgba(239,68,68,0.15)",
          }}
        >
          <AlertCircle size={12} />
          MAYDAY
        </button>

        <button
          onClick={onRequestClose}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-white transition-all hover:brightness-110"
          style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
          title="Resolve this incident"
        >
          <CheckSquare size={12} />
          Resolve
        </button>

        <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.06)" }} />

        <form action="/api/auth/logout" method="POST" className="flex">
          <button type="submit" title="Logout" className="p-1.5 rounded-md hover:bg-white/[0.04]">
            <LogOut size={13} style={{ color: "#71717a" }} />
          </button>
        </form>
      </div>
    </header>
  );
}
