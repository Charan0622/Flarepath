"use client";

import { useEffect, useState } from "react";
import { Radio, Check, Volume2 } from "lucide-react";
import { TASKS } from "@/lib/chief-data";

interface Order {
  id: string; task: string; position: string; assigned_at: string;
}

// Compact history of past orders — voice waveform + transcribed caption
// pattern. Latest at top.
export default function OrderStream({ orders, latestId }: { orders: Order[]; latestId: string | null }) {
  if (orders.length === 0) {
    return (
      <div className="mx-3 text-[11px] italic px-3 py-2" style={{ color: "#71717a" }}>
        No orders in the log yet.
      </div>
    );
  }

  return (
    <div className="mx-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] px-1" style={{ color: "#71717a" }}>
        <Radio size={10} />
        <span>Orders Log</span>
        <span className="ml-auto">{orders.length}</span>
      </div>
      {[...orders].reverse().map((o) => {
        const taskMeta = TASKS.find((t) => t.key === o.task);
        const isLatest = o.id === latestId;
        return (
          <div
            key={o.id}
            className="rounded-lg px-3 py-2 flex items-center gap-2"
            style={{
              background: isLatest ? `${taskMeta?.color ?? "#71717a"}14` : "rgba(255,255,255,0.02)",
              border: `1px solid ${isLatest ? `${taskMeta?.color ?? "#71717a"}40` : "rgba(255,255,255,0.05)"}`,
            }}
          >
            <MiniWaveform color={taskMeta?.color ?? "#71717a"} animated={isLatest} />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-white truncate">
                {taskMeta?.label ?? o.task}
              </div>
              <div className="text-[9px]" style={{ color: "#71717a" }}>
                {o.position.toUpperCase()} · {new Date(o.assigned_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
              </div>
            </div>
            {!isLatest && <Check size={10} style={{ color: "#22c55e" }} />}
            <button className="p-1 rounded hover:bg-white/[0.05]" title="Replay">
              <Volume2 size={11} style={{ color: "#a1a1aa" }} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MiniWaveform({ color, animated }: { color: string; animated: boolean }) {
  const [bars, setBars] = useState<number[]>(() => Array(8).fill(0.3));
  useEffect(() => {
    if (!animated) { setBars(Array(8).fill(0.2)); return; }
    const id = setInterval(() => {
      setBars(() => Array(8).fill(0).map(() => 0.2 + Math.random() * 0.7));
    }, 140);
    return () => clearInterval(id);
  }, [animated]);
  return (
    <div className="flex items-end gap-[2px] h-5 w-10">
      {bars.map((b, i) => (
        <div
          key={i}
          className="flex-1 rounded-full transition-all"
          style={{ height: `${Math.round(b * 100)}%`, background: color, opacity: animated ? 0.85 : 0.45 }}
        />
      ))}
    </div>
  );
}
