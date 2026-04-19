"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Truck, MapPin, Clock, ChevronDown } from "lucide-react";

interface Recommendation {
  vehicle_id: string;
  call_sign: string;
  type: string;
  capacity: number;
  station_name: string;
  distance_km: number;
  eta_minutes: number;
  score: number;
  coordinates: { lat: number; lng: number };
}

interface Props {
  isOpen: boolean;
  incidentId: string;
  incidentAddress: string;
  incidentCoords: { lat: number; lng: number } | null;
  onClose: () => void;
  onDispatched: () => void;
}

export default function DispatchModal({
  isOpen, incidentId, incidentAddress, incidentCoords, onClose, onDispatched,
}: Props) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen || !incidentId) return;
    setLoading(true);
    fetch(`/api/dispatch/recommend?incidentId=${incidentId}`)
      .then((r) => r.json())
      .then((json) => {
        setRecommendations(json.data?.recommendations ?? []);
        if (json.data?.recommendations?.[0]) {
          setSelectedId(json.data.recommendations[0].vehicle_id);
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, incidentId]);

  async function handleDispatch() {
    if (!selectedId || !incidentCoords) return;
    setDispatching(true);

    const vehicle = recommendations.find((r) => r.vehicle_id === selectedId);
    if (!vehicle) return;

    // Get route
    const routeRes = await fetch(
      `/api/route/optimize?origin_lng=${vehicle.coordinates.lng}&origin_lat=${vehicle.coordinates.lat}&dest_lng=${incidentCoords.lng}&dest_lat=${incidentCoords.lat}`
    );
    const routeJson = await routeRes.json();
    const routeData = routeJson.data;

    // Create dispatch
    await fetch("/api/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incident_id: incidentId,
        vehicle_id: selectedId,
        route_geojson: routeData?.geometry,
        distance_m: routeData?.distance_m,
        eta_seconds: routeData?.duration_s,
      }),
    });

    setDispatching(false);
    queryClient.invalidateQueries({ queryKey: ["incidents"] });
    queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    onDispatched();
  }

  if (!isOpen) return null;

  const displayed = showAll ? recommendations : recommendations.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-[#1a1a1e] bg-[#0a0a0b] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1a1a1e] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Dispatch Resources</h2>
            <p className="text-xs text-[#888] mt-0.5 truncate max-w-[280px]">{incidentAddress}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-[#888] hover:bg-[#1a1a1e]">
            <X size={18} />
          </button>
        </div>

        {/* Recommendations */}
        <div className="max-h-[50vh] overflow-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-[#ff2d2d]" />
            </div>
          ) : recommendations.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#555]">No available vehicles</p>
          ) : (
            <>
              {displayed.map((rec) => (
                <button
                  key={rec.vehicle_id}
                  type="button"
                  onClick={() => setSelectedId(rec.vehicle_id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedId === rec.vehicle_id
                      ? "border-[#ff2d2d]/50 bg-[#ff2d2d]/5"
                      : "border-[#1a1a1e] bg-[#121214] hover:border-[#2a2a2e]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck size={16} className="text-[#ccc]" />
                      <span className="text-sm font-medium text-white">{rec.call_sign}</span>
                      <span className="rounded bg-[#1a1a1e] px-1.5 py-0.5 text-[10px] text-[#888]">
                        {rec.type}
                      </span>
                    </div>
                    <span className="text-xs text-[#888]">
                      Score: {Math.round(rec.score * 100)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-[#888]">
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {rec.station_name}
                    </span>
                    <span>{rec.distance_km} km</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      ~{rec.eta_minutes} min
                    </span>
                  </div>
                </button>
              ))}

              {recommendations.length > 3 && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="flex w-full items-center justify-center gap-1 py-2 text-xs text-[#888] hover:text-[#ccc]"
                >
                  <ChevronDown size={14} />
                  Show all {recommendations.length} vehicles
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#1a1a1e] px-6 py-4">
          <button
            onClick={handleDispatch}
            disabled={!selectedId || dispatching}
            className="w-full rounded-md bg-[#ff2d2d] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e02525] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {dispatching ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Computing route & dispatching...
              </>
            ) : (
              "Confirm Dispatch"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
