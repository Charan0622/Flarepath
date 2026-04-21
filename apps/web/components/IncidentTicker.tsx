"use client";

import { useMemo } from "react";
import { AlertTriangle, Flame, Radio } from "lucide-react";
import { displayNameFor } from "@/lib/crew-data";

interface Incident {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  status: string;
  address: string;
  created_at: string;
}

interface Dispatch {
  id: string;
  status: string;
  eta_seconds: number | null;
  vehicle: { call_sign: string } | null;
  incident: { address: string; severity?: string; type?: string } | null;
}

interface Props {
  incidents: Incident[];
  dispatches: Dispatch[];
  onSelect?: (id: string) => void;
}

const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const STATUS_COLOR: Record<string, string> = {
  assigned: "#f97316",
  acknowledged: "#f97316",
  en_route: "#eab308",
  on_scene: "#22c55e",
};

type Item =
  | { kind: "incident"; id: string; severity: string; type: string; address: string; time: string }
  | { kind: "dispatch"; id: string; status: string; unit: string; dest: string; eta: string; color: string };

function buildItems(incidents: Incident[], dispatches: Dispatch[]): Item[] {
  const active = incidents.filter((i) => !["resolved", "cancelled"].includes(i.status));
  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedInc = [...active].sort(
    (a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9)
  );

  const inc: Item[] = sortedInc.map((i) => ({
    kind: "incident",
    id: i.id,
    severity: i.severity,
    type: i.type.replace(/_/g, " "),
    address: i.address.split(",")[0],
    time: new Date(i.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }));

  const disp: Item[] = dispatches
    .filter((d) => d.vehicle && d.incident)
    .map((d) => ({
      kind: "dispatch",
      id: d.id,
      status: d.status,
      unit: displayNameFor(d.vehicle!.call_sign),
      dest: d.incident!.address.split(",")[0],
      eta: d.eta_seconds ? `${Math.ceil(d.eta_seconds / 60)}m` : "",
      color: STATUS_COLOR[d.status] ?? "#888",
    }));

  const out: Item[] = [];
  const maxLen = Math.max(inc.length, disp.length);
  for (let i = 0; i < maxLen; i++) {
    if (inc[i]) out.push(inc[i]);
    if (disp[i]) out.push(disp[i]);
  }
  return out;
}

export default function IncidentTicker({ incidents, dispatches, onSelect }: Props) {
  const items = useMemo(() => buildItems(incidents, dispatches), [incidents, dispatches]);

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 h-full text-[10px]" style={{ color: "#52525b" }}>
        <Radio size={11} />
        <span>Live feed idle — no active incidents</span>
      </div>
    );
  }

  const duration = Math.max(30, items.length * 6);

  return (
    <div className="ticker-wrap group relative h-full overflow-hidden" style={{ maskImage: "linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)" }}>
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center gap-1.5 px-3" style={{ background: "linear-gradient(90deg, #0b0b0f 70%, transparent)" }}>
        <div className="relative w-1.5 h-1.5">
          <div className="absolute inset-0 rounded-full bg-[#ef4444] animate-ping opacity-60" />
          <div className="relative w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
        </div>
        <span className="text-[9px] font-bold tracking-[0.18em] text-[#ef4444]">LIVE</span>
        <div className="h-3 w-px ml-1" style={{ background: "rgba(255,255,255,0.08)" }} />
      </div>

      <div
        className="ticker-track flex items-center gap-6 h-full whitespace-nowrap will-change-transform"
        style={{ animation: `ticker-scroll ${duration}s linear infinite`, paddingLeft: "72px" }}
      >
        {[...items, ...items].map((it, idx) => (
          <TickerItem key={`${it.id}-${idx}`} item={it} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function TickerItem({ item, onSelect }: { item: Item; onSelect?: (id: string) => void }) {
  if (item.kind === "incident") {
    const color = SEV_COLOR[item.severity] ?? "#888";
    return (
      <button
        type="button"
        onClick={() => onSelect?.(item.id)}
        className="flex items-center gap-2 text-[11px] shrink-0 hover:brightness-125 transition"
      >
        {item.severity === "critical" ? (
          <AlertTriangle size={11} style={{ color }} />
        ) : (
          <Flame size={11} style={{ color }} />
        )}
        <span className="font-semibold uppercase tracking-wider text-[9px]" style={{ color }}>
          {item.severity}
        </span>
        <span className="capitalize" style={{ color: "#d0d0d4" }}>{item.type}</span>
        <span style={{ color: "#58585e" }}>·</span>
        <span style={{ color: "#88888e" }}>{item.address}</span>
        <span style={{ color: "#38383e" }}>{item.time}</span>
        <span className="mx-3 w-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 text-[11px] shrink-0">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
      <span className="font-bold tracking-wider" style={{ color: item.color }}>{item.unit}</span>
      <span style={{ color: "#58585e" }}>{item.status.replace(/_/g, " ")}</span>
      <span style={{ color: "#48484e" }}>→</span>
      <span style={{ color: "#88888e" }}>{item.dest}</span>
      {item.eta && <span style={{ color: "#58585e" }}>{item.eta}</span>}
      <span className="mx-3 w-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}
