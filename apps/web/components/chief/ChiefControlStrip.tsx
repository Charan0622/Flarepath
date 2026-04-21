"use client";

import { Clock, AlertCircle, Download, CheckSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { useChief } from "@/lib/chief-store";

// Compact top strip: live clock, PAR button, on-scene duration, close-incident trigger.
export default function ChiefControlStrip({ onSceneAt, onClose }: { onSceneAt: string | null; onClose: () => void }) {
  const { state, startPar, completePar } = useChief();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const onSceneMs = onSceneAt ? now - new Date(onSceneAt).getTime() : null;
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`;
  };
  const activePar = state.parChecks.find((p) => !p.completed_at);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 glass-strip glass-divider-b">
      <div className="flex items-center gap-4 text-[11px]" style={{ color: "#a1a1aa" }}>
        <span className="flex items-center gap-1.5 tabular-nums">
          <Clock size={11} />
          {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
        </span>
        {onSceneMs !== null && (
          <span className="flex items-center gap-1 font-mono">
            on-scene <span className="text-white font-semibold tabular-nums">{fmt(onSceneMs)}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {activePar ? (
          <button onClick={completePar} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold"
            style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.35)" }}>
            <CheckSquare size={11} />
            Complete PAR ({activePar.responded.length})
          </button>
        ) : (
          <button onClick={startPar} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold"
            style={{ background: "rgba(234,179,8,0.1)", color: "#eab308", border: "1px solid rgba(234,179,8,0.25)" }}>
            <AlertCircle size={11} />
            Call PAR
          </button>
        )}
        <button onClick={onClose} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
          <Download size={11} />
          Close & Export ICS-201
        </button>
      </div>
    </div>
  );
}
