"use client";

import { useMemo } from "react";
import {
  Inbox, Radio, CheckCheck, AlertCircle, Clock, Info, Megaphone,
  Shield, Wind, Flame, Users,
} from "lucide-react";
import { useChief } from "@/lib/chief-store";
import { composeOrder, demoWeather } from "@/lib/chief-data";

interface Props {
  dispatchId: string;
  incidentId: string;
  incidentType: string;
  incidentAddress: string;
  severity: string;
  etaSeconds: number;
  onSceneAt: string | null;
  triageReasoning: string | null;
  dispatcherId?: string;
}

type Entry =
  | { id: string; kind: "primary_order";    ts: string; ack: boolean; text: string; dispatcherId: string }
  | { id: string; kind: "broadcast";        ts: string; text: string; channel: string }
  | { id: string; kind: "situational";      ts: string; text: string }
  | { id: string; kind: "system";           ts: string; text: string };

export default function DispatcherInboxView(props: Props) {
  const { state } = useChief();
  const weather = demoWeather(props.incidentAddress);

  const entries = useMemo<Entry[]>(() => {
    const createdAt = state.orderAckAt ?? new Date().toISOString();
    const ts = (offsetMin: number) => new Date(new Date(createdAt).getTime() - offsetMin * 60_000).toISOString();

    const out: Entry[] = [
      {
        id: "order-1",
        kind: "primary_order",
        ts: state.orderAckAt ?? new Date().toISOString(),
        ack: state.orderAcknowledged,
        text: composeOrder(props.incidentType, props.incidentAddress, props.severity, props.etaSeconds),
        dispatcherId: props.dispatcherId ?? "DSP-07",
      },
      { id: "sit-1", kind: "situational", ts: ts(-2), text: `Weather update: wind ${weather.wind_kph} km/h @ ${weather.wind_deg}°, RH ${weather.rh}%, fire-weather index ${weather.fire_weather_index.toUpperCase()}. Position crews upwind.` },
    ];
    if (props.triageReasoning) out.push({ id: "ai-1", kind: "situational", ts: ts(-3), text: `AI triage: ${props.triageReasoning}` });
    if (props.severity === "critical" || props.severity === "high") {
      out.push({ id: "bcast-1", kind: "broadcast", ts: ts(-1), channel: "TAC-ALL", text: `2nd alarm stand-by. RIT pre-stage on Side A. Medical rendezvous established at apparatus.` });
    }
    // Periodic updates after on-scene
    if (props.onSceneAt) {
      out.push({ id: "sys-1", kind: "system", ts: props.onSceneAt, text: "Unit confirmed on-scene. Command transferred to field captain." });
    }
    // User-raised mayday gets echoed back from dispatch
    if (state.mayday) {
      out.push({ id: "bcast-2", kind: "broadcast", ts: state.mayday.raised_at, channel: "EMERGENCY", text: `MAYDAY received — ${state.mayday.name} at ${state.mayday.location}. RIT deploying. All non-essential radio traffic clear TAC-1.` });
    }
    if (state.parChecks.length > 0) {
      const last = state.parChecks[state.parChecks.length - 1];
      out.push({ id: `par-${last.initiated_at}`, kind: "system", ts: last.initiated_at, text: `PAR called · ${last.responded.length} acknowledged${last.completed_at ? " · PAR complete" : " · in progress"}.` });
    }

    return out.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [state, props]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="glass-divider-b px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.22), rgba(59,130,246,0.06))", border: "1px solid rgba(59,130,246,0.45)" }}>
            <Inbox size={16} style={{ color: "#60a5fa" }} />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-white tracking-tight">Dispatcher Inbox</h2>
            <p className="text-[11px]" style={{ color: "#71717a" }}>Orders, broadcasts, and situational updates from command</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]" style={{ color: "#71717a" }}>
          <Radio size={10} />
          <span>Monitoring <span className="font-mono text-[#a1a1aa]">TAC-1</span> · EMERGENCY</span>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="max-w-3xl mx-auto space-y-4">
          {entries.map((e) => <EntryCard key={e.id} entry={e} />)}
          {entries.length === 0 && (
            <div className="text-center py-12 text-[12px]" style={{ color: "#71717a" }}>
              No messages from command. When dispatcher transmits, orders appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  if (entry.kind === "primary_order") {
    return (
      <article
        className="rounded-xl p-4"
        style={{
          background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(59,130,246,0.04))",
          border: `1px solid ${entry.ack ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.35)"}`,
          boxShadow: entry.ack ? "0 0 14px rgba(34,197,94,0.15)" : "0 0 18px rgba(239,68,68,0.15)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.4)" }}>
              <Megaphone size={11} style={{ color: "#ef4444" }} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-white">PRIMARY ORDER</div>
              <div className="text-[9px] font-mono" style={{ color: "#a1a1aa" }}>from {entry.dispatcherId}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px]" style={{ color: "#71717a" }}>
            <Clock size={10} />
            {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
          </div>
        </div>
        <p className="text-[12px] leading-relaxed font-mono p-3 rounded" style={{ color: "#e4e4e7", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.04)" }}>
          {entry.text}
        </p>
        <div className="flex items-center gap-2 mt-2 text-[10px]">
          {entry.ack ? (
            <span className="flex items-center gap-1 font-semibold" style={{ color: "#22c55e" }}>
              <CheckCheck size={10} />
              Acknowledged
            </span>
          ) : (
            <span className="flex items-center gap-1 font-semibold animate-pulse" style={{ color: "#ef4444" }}>
              <AlertCircle size={10} />
              Pending read-back on TAC-1
            </span>
          )}
        </div>
      </article>
    );
  }

  if (entry.kind === "broadcast") {
    const isEmergency = entry.channel === "EMERGENCY";
    return (
      <article className="rounded-xl p-3" style={{
        background: isEmergency ? "rgba(239,68,68,0.06)" : "rgba(249,115,22,0.06)",
        border: `1px solid ${isEmergency ? "rgba(239,68,68,0.3)" : "rgba(249,115,22,0.25)"}`,
      }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Radio size={11} style={{ color: isEmergency ? "#ef4444" : "#f97316" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isEmergency ? "#ef4444" : "#f97316" }}>
              {isEmergency ? "Emergency broadcast" : "Broadcast"} · {entry.channel}
            </span>
          </div>
          <span className="text-[10px] font-mono" style={{ color: "#71717a" }}>
            {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
          </span>
        </div>
        <p className="text-[11px]" style={{ color: "#e4e4e7" }}>{entry.text}</p>
      </article>
    );
  }

  if (entry.kind === "situational") {
    return (
      <article className="glass-card rounded-xl p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Info size={11} style={{ color: "#3b82f6" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#60a5fa" }}>Situational update</span>
          </div>
          <span className="text-[10px] font-mono" style={{ color: "#71717a" }}>
            {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
          </span>
        </div>
        <p className="text-[11px]" style={{ color: "#d4d4d8" }}>{entry.text}</p>
      </article>
    );
  }

  // system
  return (
    <article className="px-3 py-2 flex items-center gap-2 text-[10.5px] rounded-md"
      style={{ background: "rgba(255,255,255,0.02)", color: "#a1a1aa", border: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-[9px] font-mono tabular-nums" style={{ color: "#52525b" }}>
        {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
      </span>
      <span>· {entry.text}</span>
    </article>
  );
}
