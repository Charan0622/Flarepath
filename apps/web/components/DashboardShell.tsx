"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Clock, Activity, AlertTriangle, Navigation, CheckCircle2, Search, Inbox } from "lucide-react";
import IncidentFeed from "./IncidentFeed";
import IncidentDetail from "./IncidentDetail";
import LiveMap from "./LiveMap";
import NewIncidentModal from "./NewIncidentModal";
import KeyboardShortcuts from "./KeyboardShortcuts";
import CommandPalette from "./CommandPalette";
import IncidentTicker from "./IncidentTicker";
import UnitDetailPanel from "./UnitDetailPanel";
import NavRail from "./NavRail";
import BrandMark from "./BrandMark";
import { showToast } from "./Toast";

async function fetchIncidents() {
  const res = await fetch("/api/incidents?limit=50");
  return (await res.json()).data?.incidents ?? [];
}

async function fetchDispatches() {
  const res = await fetch("/api/dispatch/active");
  return (await res.json()).data?.dispatches ?? [];
}

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{time}</span>;
}

function StatTile({
  icon: Icon, label, value, accent, pulse,
}: { icon: typeof Activity; label: string; value: number; accent: string; pulse?: boolean }) {
  return (
    <div className="glass-card flex items-center gap-2.5 rounded-md px-3 py-1.5">
      <div className="relative">
        <Icon size={13} style={{ color: accent }} />
        {pulse && value > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-ping" style={{ background: accent }} />
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[13px] font-semibold tabular-nums" style={{ color: accent }}>{value}</span>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: "#6a6a72" }}>{label}</span>
      </div>
    </div>
  );
}

export default function DashboardShell() {
  const [selId, setSelIdState] = useState<string | null>(null);
  const [selDispatchId, setSelDispatchIdState] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showCmd, setShowCmd] = useState(false);

  // Selection is mutually exclusive — picking an incident clears the unit view, and vice versa.
  const setSelId = useCallback((id: string | null) => {
    setSelIdState(id);
    if (id) setSelDispatchIdState(null);
  }, []);
  const setSelDispatchId = useCallback((id: string | null) => {
    setSelDispatchIdState(id);
    if (id) setSelIdState(null);
  }, []);
  const router = useRouter();
  const qc = useQueryClient();

  const { data: incidents = [], isLoading } = useQuery({ queryKey: ["incidents"], queryFn: fetchIncidents, refetchInterval: 10000 });
  const { data: dispatches = [] } = useQuery({ queryKey: ["active-dispatches"], queryFn: fetchDispatches, refetchInterval: 8000 });

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission().catch(() => {});
  }, []);

  const prevStatus = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    if (!incidents.length) return;
    const current = new Map<string, { status: string; address: string; type: string }>();
    incidents.forEach((i: { id: string; status: string; address: string; type: string }) => {
      current.set(i.id, { status: i.status, address: i.address, type: i.type });
    });
    if (prevStatus.current.size > 0) {
      current.forEach((info, id) => {
        const prev = prevStatus.current.get(id);
        if (prev && prev !== "resolved" && info.status === "resolved") {
          const label = info.type.replace(/_/g, " ");
          showToast("success", `Resolved — ${label} at ${info.address.split(",")[0]}`);
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("Flarepath — Situation resolved", {
                body: `${label} at ${info.address.split(",")[0]}`,
                icon: "/icons/icon-192.png",
                tag: `resolved-${id}`,
              });
            } catch {}
          }
        }
      });
    }
    const next = new Map<string, string>();
    current.forEach((v, k) => next.set(k, v.status));
    prevStatus.current = next;
  }, [incidents]);

  const openNew = useCallback(() => setShowNew(true), []);
  const close = useCallback(() => { setSelIdState(null); setSelDispatchIdState(null); }, []);
  const toggleCmd = useCallback(() => setShowCmd((p) => !p), []);

  const active = incidents.filter((i: { status: string }) => !["resolved", "cancelled"].includes(i.status));
  const critCount = active.filter((i: { severity: string }) => i.severity === "critical").length;
  const enRoute = dispatches.filter((d: { status: string }) => d.status === "en_route").length;
  const onScene = dispatches.filter((d: { status: string }) => d.status === "on_scene").length;

  return (
    <div
      className="h-screen w-screen overflow-hidden grid"
      style={{
        gridTemplateRows: "52px 1fr 40px",
        gridTemplateColumns: "56px 300px 1fr",
      }}
    >
      <KeyboardShortcuts onNewIncident={openNew} onCloseDrawer={close} onCommandPalette={toggleCmd} />

      {/* Nav rail — spans all rows */}
      <div className="row-span-3"><NavRail /></div>

      {/* HEADER — spans 2 remaining columns */}
      <header className="col-span-2 flex items-center justify-between px-5 glass-strip glass-divider-b">
        <BrandMark showWord hideMark subtitle="Command Center" />

        <div className="flex items-center gap-2">
          <StatTile icon={AlertTriangle} label="critical" value={critCount} accent="#ef4444" pulse />
          <StatTile icon={Activity} label="active" value={active.length} accent="#e4e4e7" />
          <StatTile icon={Navigation} label="en route" value={enRoute} accent="#eab308" />
          <StatTile icon={CheckCircle2} label="on scene" value={onScene} accent="#22c55e" />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] tabular-nums" style={{ color: "#a1a1aa" }}>
          <Clock size={12} />
          <LiveClock />
        </div>
      </header>

      {/* LEFT SIDEBAR — incident feed */}
      <aside className="glass glass-divider-r flex flex-col overflow-hidden min-h-0">
        <div className="flex items-center justify-between px-4 py-3 glass-divider-b">
          <div className="flex items-center gap-2">
            <Inbox size={13} style={{ color: "#a1a1aa" }} />
            <span className="text-[12px] font-semibold text-white">Incidents</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded tabular-nums" style={{ background: "rgba(255,255,255,0.06)", color: "#a1a1aa" }}>
              {active.length}
            </span>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:brightness-110"
            style={{ background: "#ef4444" }}
          >
            <Plus size={11} />
            New
          </button>
        </div>

        <button
          onClick={toggleCmd}
          className="flex items-center gap-2 mx-3 mt-3 px-2.5 py-1.5 text-[11px] rounded-md transition-colors hover:bg-white/[0.04]"
          style={{ background: "rgba(255,255,255,0.03)", color: "#71717a", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Search size={11} />
          <span>Search incidents…</span>
          <kbd className="ml-auto text-[9px] px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#a1a1aa" }}>⌘K</kbd>
        </button>

        <div className="flex-1 overflow-auto mt-1">
          <IncidentFeed onSelect={setSelId} selectedId={selId} incidents={incidents} isLoading={isLoading} />
        </div>
      </aside>

      {/* CENTER — map (now takes the full remaining width; detail pane overlays on selection) */}
      <main className="relative overflow-hidden" style={{ background: "#08080c" }}>
        <LiveMap
          onIncidentClick={setSelId}
          onVehicleClick={setSelDispatchId}
          incidents={incidents}
          activeDispatches={dispatches}
          selectedIncidentId={selId}
          selectedDispatchId={selDispatchId}
        />
        {critCount > 0 && (
          <div className="pointer-events-none absolute inset-0" style={{
            boxShadow: "inset 0 0 100px rgba(239,68,68,0.08), inset 0 0 260px rgba(239,68,68,0.025)",
          }} />
        )}

        {/* Sliding transparent detail overlay — only mounts when something is selected */}
        <AnimatePresence>
          {(selDispatchId || selId) && (
            <motion.aside
              key={selDispatchId ?? selId}
              initial={{ x: 420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 420, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="glass-strong absolute top-3 right-3 bottom-3 w-[400px] rounded-xl flex flex-col overflow-hidden"
              style={{
                boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              {selDispatchId ? (
                <UnitDetailPanel
                  dispatchId={selDispatchId}
                  onClose={close}
                  onOpenIncident={setSelId}
                />
              ) : selId ? (
                <IncidentDetail incidentId={selId} onClose={close} />
              ) : null}
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      {/* TICKER — spans the 2 content columns (not the rail) */}
      <footer className="col-span-2 overflow-hidden glass-strip glass-divider-t">
        <IncidentTicker incidents={incidents} dispatches={dispatches} onSelect={setSelId} />
      </footer>

      {/* MODALS */}
      <AnimatePresence>
        {showNew && (
          <NewIncidentModal isOpen={showNew} onClose={() => setShowNew(false)} onCreated={(id) => { setShowNew(false); setSelId(id); qc.invalidateQueries({ queryKey: ["incidents"] }); qc.invalidateQueries({ queryKey: ["active-dispatches"] }); }} />
        )}
      </AnimatePresence>
      <CommandPalette isOpen={showCmd} onClose={() => setShowCmd(false)} onNewIncident={() => { setShowCmd(false); openNew(); }} onNavigate={(p) => router.push(p)} />
    </div>
  );
}
