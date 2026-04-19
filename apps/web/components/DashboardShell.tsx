"use client";

import { useState, useCallback, useEffect } from "react";
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

export default function DashboardShell() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [simulatingVehicle, setSimulatingVehicle] = useState<{ lng: number; lat: number } | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<unknown>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: fetchIncidents,
  });

  const openNew = useCallback(() => setShowNewForm(true), []);
  const closeDrawer = useCallback(() => { setSelectedId(null); setRouteGeoJSON(null); setSimulatingVehicle(null); }, []);
  const togglePalette = useCallback(() => setShowCommandPalette((p) => !p), []);

  // Simulate vehicle movement when a dispatched incident is selected
  useEffect(() => {
    if (!selectedId || !routeGeoJSON) return;
    const geom = routeGeoJSON as GeoJSON.LineString;
    const coords = geom.coordinates;
    if (!coords || coords.length < 2) return;

    let step = 0;
    const interval = setInterval(() => {
      if (step >= coords.length) {
        clearInterval(interval);
        return;
      }
      setSimulatingVehicle({ lng: coords[step][0], lat: coords[step][1] });
      step += 2;
    }, 500);

    return () => clearInterval(interval);
  }, [selectedId, routeGeoJSON]);

  // Active counts for header
  const criticalCount = incidents.filter((i: { severity: string; status: string }) => i.severity === "critical" && !["resolved", "cancelled"].includes(i.status)).length;
  const activeCount = incidents.filter((i: { status: string }) => !["resolved", "cancelled"].includes(i.status)).length;

  return (
    <div className="flex h-full bg-[#050507]">
      <KeyboardShortcuts onNewIncident={openNew} onCloseDrawer={closeDrawer} onCommandPalette={togglePalette} />

      {/* Left Panel — Glass effect */}
      <div className="w-[340px] shrink-0 flex flex-col border-r border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        {/* Header */}
        <div className="border-b border-white/5 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Command Center</h1>
              <div className="mt-1 flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-[#ff2d2d]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff2d2d] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff2d2d]" />
                  </span>
                  {criticalCount} critical
                </span>
                <span className="text-[#888]">{activeCount} active</span>
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

        {/* Bottom status bar */}
        <div className="border-t border-white/5 px-4 py-2 flex items-center justify-between text-[10px] text-[#555]">
          <div className="flex items-center gap-1.5">
            <Radio size={10} className="text-[#3ddc84]" />
            <span>SJFD — San Jose Fire Dept</span>
          </div>
          <span>Live</span>
        </div>
      </div>

      {/* Center — Map */}
      <div className="relative flex-1">
        <LiveMap
          onIncidentClick={setSelectedId}
          incidents={incidents}
          routeGeoJSON={routeGeoJSON}
          dispatchedVehicleCoords={simulatingVehicle}
        />
        <WeatherWidget />

        {/* Live stats overlay */}
        <div className="absolute bottom-4 left-4 z-10 flex gap-2">
          {[
            { label: "Engines", value: "4/6", color: "#3ddc84" },
            { label: "Ladders", value: "0/1", color: "#ff7b1c" },
            { label: "Rescue", value: "1/1", color: "#3b82f6" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-[#121214]/80 backdrop-blur-sm border border-white/5 px-3 py-1.5">
              <div className="text-[10px] text-[#555]">{stat.label}</div>
              <div className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Detail */}
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
              <IncidentDetail
                incidentId={selectedId}
                onClose={closeDrawer}
                onRouteReady={(geojson) => setRouteGeoJSON(geojson)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showNewForm && (
          <NewIncidentModal
            isOpen={showNewForm}
            onClose={() => setShowNewForm(false)}
            onCreated={(id) => {
              setShowNewForm(false);
              setSelectedId(id);
              queryClient.invalidateQueries({ queryKey: ["incidents"] });
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
