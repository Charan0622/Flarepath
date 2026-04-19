"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, AlertTriangle, Navigation, ExternalLink } from "lucide-react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const STATUS_FLOW = [
  { key: "acknowledged", label: "Acknowledge", color: "#ff7b1c" },
  { key: "en_route", label: "En Route", color: "#ffc93c" },
  { key: "on_scene", label: "On Scene", color: "#3ddc84" },
  { key: "returning", label: "Returning", color: "#3b82f6" },
  { key: "completed", label: "Clear", color: "#888" },
];

async function fetchIncident(id: string) {
  const res = await fetch(`/api/incidents/${id}`);
  return (await res.json()).data;
}

export default function ResponderIncidentPage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.id as string;
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [updating, setUpdating] = useState(false);

  const { data: incident, refetch } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: () => fetchIncident(incidentId),
  });

  // Map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !incident) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-121.8863, 37.3382],
      zoom: 14,
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [incident]);

  async function updateDispatchStatus(dispatchId: string, status: string) {
    setUpdating(true);
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);

    await fetch(`/api/dispatch/${dispatchId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    await refetch();
    setUpdating(false);
  }

  if (!incident) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ff2d2d] border-t-transparent" />
      </div>
    );
  }

  const dispatch = incident.dispatches?.[0];
  const currentStatus = dispatch?.status ?? "assigned";
  const currentStepIdx = STATUS_FLOW.findIndex((s) => s.key === currentStatus);
  const nextStep = STATUS_FLOW[currentStepIdx + 1];

  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(incident.address)}&travelmode=driving&dir_action=navigate`;

  return (
    <div className="flex h-full flex-col">
      {/* Map (70%) */}
      <div className="flex-[7]" ref={mapContainer} />

      {/* Bottom Sheet (30%) */}
      <div className="flex-[3] border-t border-[#1a1a1e] bg-[#0a0a0b] p-4 space-y-3 overflow-auto">
        {/* Incident Info */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-white capitalize">
              {incident.type?.replace(/_/g, " ")}
            </h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#888]">
              <MapPin size={12} />
              <span>{incident.address}</span>
            </div>
          </div>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: incident.severity === "critical" ? "#ff2d2d20" : "#ff7b1c20",
              color: incident.severity === "critical" ? "#ff2d2d" : "#ff7b1c",
            }}
          >
            {incident.severity}
          </span>
        </div>

        {/* Hazards */}
        {incident.hazards?.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[#ff7b1c]">
            <AlertTriangle size={12} />
            <span>{incident.hazards.join(", ")}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {dispatch && nextStep && (
            <button
              onClick={() => updateDispatchStatus(dispatch.id, nextStep.key)}
              disabled={updating}
              className="flex-1 rounded-xl py-4 text-base font-bold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: nextStep.color, minHeight: "56px" }}
            >
              {updating ? "Updating..." : nextStep.label}
            </button>
          )}

          {dispatch && currentStatus === "acknowledged" && (
            <button
              onClick={() => router.push(`/navigate/${dispatch.id}`)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#ff2d2d] px-6 py-4 text-base font-bold text-white"
              style={{ minHeight: "56px" }}
            >
              <Navigation size={20} />
              Navigate
            </button>
          )}
        </div>

        {/* Google Maps fallback */}
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg border border-[#333] py-2.5 text-sm text-[#888] hover:text-white"
        >
          <ExternalLink size={14} />
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}
