"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Radio } from "lucide-react";
import IncidentFeed from "./IncidentFeed";
import IncidentDetail from "./IncidentDetail";
import LiveMap from "./LiveMap";
import NewIncidentModal from "./NewIncidentModal";
import KeyboardShortcuts from "./KeyboardShortcuts";
import WeatherWidget from "./WeatherWidget";
import CommandPalette from "./CommandPalette";

async function fetchIncidents() {
  const res = await fetch("/api/incidents?limit=50");
  const json = await res.json();
  return json.data?.incidents ?? [];
}

async function fetchActiveDispatches() {
  const res = await fetch("/api/dispatch/active");
  const json = await res.json();
  return json.data?.dispatches ?? [];
}

export default function DashboardShell() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: fetchIncidents,
  });

  const { data: activeDispatches = [] } = useQuery({
    queryKey: ["active-dispatches"],
    queryFn: fetchActiveDispatches,
    refetchInterval: 10000, // Refresh every 10s for live feel
  });

  const openNew = useCallback(() => setShowNewForm(true), []);
  const closeDrawer = useCallback(() => setSelectedId(null), []);
  const togglePalette = useCallback(() => setShowCommandPalette((p) => !p), []);

  // Live counts
  const activeIncidents = incidents.filter((i: { status: string }) => !["resolved", "cancelled"].includes(i.status));
  const criticalCount = activeIncidents.filter((i: { severity: string }) => i.severity === "critical").length;
  const enRouteCount = activeDispatches.filter((d: { status: string }) => d.status === "en_route").length;
  const onSceneCount = activeDispatches.filter((d: { status: string }) => d.status === "on_scene").length;

  return (
    <div className="flex h-full bg-[#050507]">
      <KeyboardShortcuts onNewIncident={openNew} onCloseDrawer={closeDrawer} onCommandPalette={togglePalette} />

      {/* Left Panel */}
      <div className="w-[340px] shrink-0 flex flex-col border-r border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        {/* Header */}
        <div className="border-b border-white/5 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Command Center</h1>
              <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-[#ff2d2d]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff2d2d] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff2d2d]" />
                  </span>
                  {criticalCount} critical
                </span>
                <span className="text-[#ffc93c]">{enRouteCount} en route</span>
                <span className="text-[#3ddc84]">{onSceneCount} on scene</span>
              </div>
            </div>
            <motion.button
              onClick={openNew}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 rounded-lg bg-[#ff2d2d] px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-[#ff2d2d]/20"
            >
              <Plus size={14} />
              New
            </motion.button>
          </div>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-auto">
          <IncidentFeed onSelect={setSelectedId} selectedId={selectedId} incidents={incidents} isLoading={isLoading} />
        </div>

        {/* Live dispatch ticker */}
        {activeDispatches.length > 0 && (
          <div className="border-t border-white/5 px-3 py-2 space-y-1 max-h-28 overflow-auto">
            <div className="text-[9px] font-semibold text-[#555] uppercase tracking-wider">Live Dispatches</div>
            {activeDispatches.slice(0, 4).map((d: { id: string; vehicle: { call_sign: string } | null; status: string; eta_seconds: number | null }) => (
              <div key={d.id} className="flex items-center justify-between text-[10px]">
                <span className="text-[#ccc]">🚒 {d.vehicle?.call_sign ?? "?"}</span>
                <span style={{ color: d.status === "en_route" ? "#ffc93c" : d.status === "on_scene" ? "#3ddc84" : "#ff7b1c" }}>
                  {d.status.replace(/_/g, " ")} {d.eta_seconds ? `· ${Math.ceil(d.eta_seconds / 60)}m` : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-white/5 px-4 py-2 flex items-center justify-between text-[10px] text-[#555]">
          <div className="flex items-center gap-1.5">
            <Radio size={10} className="text-[#3ddc84]" />
            <span>SJFD — San Jose Fire Dept</span>
          </div>
          <span>{activeDispatches.length} active units</span>
        </div>
      </div>

      {/* Center — Map with ALL routes + vehicles */}
      <div className="relative flex-1">
        <LiveMap
          onIncidentClick={setSelectedId}
          incidents={incidents}
          activeDispatches={activeDispatches}
          selectedIncidentId={selectedId}
        />
        <WeatherWidget />
      </div>

      {/* Right Panel */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 384, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="shrink-0 border-l border-white/5 overflow-hidden bg-[#0a0a0b]/90 backdrop-blur-xl"
          >
            <div className="w-96 h-full overflow-auto">
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
