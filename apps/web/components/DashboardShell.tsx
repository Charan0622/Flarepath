"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import IncidentFeed from "./IncidentFeed";
import IncidentDetail from "./IncidentDetail";
import LiveMap from "./LiveMap";
import NewIncidentModal from "./NewIncidentModal";
import KeyboardShortcuts from "./KeyboardShortcuts";
import WeatherWidget from "./WeatherWidget";
import CommandPalette from "./CommandPalette";

async function fetchIncidents() {
  const res = await fetch("/api/incidents?limit=50");
  return (await res.json()).data?.incidents ?? [];
}

async function fetchActiveDispatches() {
  const res = await fetch("/api/dispatch/active");
  return (await res.json()).data?.dispatches ?? [];
}

export default function DashboardShell() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: incidents = [], isLoading } = useQuery({ queryKey: ["incidents"], queryFn: fetchIncidents });
  const { data: activeDispatches = [] } = useQuery({ queryKey: ["active-dispatches"], queryFn: fetchActiveDispatches, refetchInterval: 10000 });

  const openNew = useCallback(() => setShowNewForm(true), []);
  const closeDrawer = useCallback(() => setSelectedId(null), []);
  const togglePalette = useCallback(() => setShowCommandPalette((p) => !p), []);

  const activeIncidents = incidents.filter((i: { status: string }) => !["resolved", "cancelled"].includes(i.status));
  const criticalCount = activeIncidents.filter((i: { severity: string }) => i.severity === "critical").length;

  return (
    <div className="flex h-full" style={{ background: "#0c0c10" }}>
      <KeyboardShortcuts onNewIncident={openNew} onCloseDrawer={closeDrawer} onCommandPalette={togglePalette} />

      {/* Sidebar */}
      <div className="w-[360px] shrink-0 flex flex-col" style={{ background: "#101014", borderRight: "1px solid #1e1e24" }}>
        {/* Header */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #1e1e24" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2c-4 4-8 8-8 13a8 8 0 0016 0c0-5-4-9-8-13zm0 18a5 5 0 01-5-5c0-3 2.5-6.4 5-9.2 2.5 2.8 5 6.2 5 9.2a5 5 0 01-5 5z"/></svg>
              </div>
              <span className="text-sm font-semibold" style={{ color: "#eeeef0" }}>Flarepath</span>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors"
              style={{ background: "#ef4444", color: "white" }}
            >
              <Plus size={12} />
              New Incident
            </button>
          </div>

          {/* Search */}
          <button
            onClick={togglePalette}
            className="w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] transition-colors"
            style={{ background: "#1a1a20", color: "#58585e", border: "1px solid #2a2a32" }}
          >
            <Search size={12} />
            <span>Search incidents...</span>
            <kbd className="ml-auto rounded px-1 py-0.5 text-[9px]" style={{ background: "#222228", color: "#58585e" }}>⌘K</kbd>
          </button>

          {/* Stats */}
          <div className="mt-2.5 flex items-center gap-4 text-[10px]" style={{ color: "#58585e" }}>
            {criticalCount > 0 && (
              <span className="flex items-center gap-1" style={{ color: "#ef4444" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
                {criticalCount} critical
              </span>
            )}
            <span>{activeIncidents.length} active</span>
            <span>{activeDispatches.length} units deployed</span>
          </div>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-auto">
          <IncidentFeed onSelect={setSelectedId} selectedId={selectedId} incidents={incidents} isLoading={isLoading} />
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <LiveMap
          onIncidentClick={setSelectedId}
          incidents={incidents}
          activeDispatches={activeDispatches}
          selectedIncidentId={selectedId}
        />
        <WeatherWidget />
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="shrink-0 overflow-hidden"
            style={{ background: "#101014", borderLeft: "1px solid #1e1e24" }}
          >
            <div className="w-[400px] h-full overflow-auto">
              <IncidentDetail incidentId={selectedId} onClose={closeDrawer} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewForm && (
          <NewIncidentModal
            isOpen={showNewForm}
            onClose={() => setShowNewForm(false)}
            onCreated={(id) => {
              setShowNewForm(false);
              setSelectedId(id);
              queryClient.invalidateQueries({ queryKey: ["incidents"] });
              queryClient.invalidateQueries({ queryKey: ["active-dispatches"] });
            }}
          />
        )}
      </AnimatePresence>

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNewIncident={() => { setShowCommandPalette(false); openNew(); }}
        onNavigate={(path) => router.push(path)}
      />
    </div>
  );
}
