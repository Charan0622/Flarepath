"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Brain, MapPin, Phone, User, AlertTriangle, Radio } from "lucide-react";
import DispatchModal from "./DispatchModal";

interface IncidentDetailProps {
  incidentId: string;
  onClose: () => void;
  onRouteReady?: (geojson: unknown) => void;
}

async function fetchIncident(id: string) {
  const res = await fetch(`/api/incidents/${id}`);
  const json = await res.json();
  return json.data;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff2d2d", high: "#ff7b1c", medium: "#ffc93c", low: "#3ddc84",
};

const INCIDENT_COORDS: Record<string, { lat: number; lng: number }> = {
  "201 S 4th St, San Jose, CA 95112": { lat: 37.3335, lng: -121.8850 },
  "70 S 1st St, San Jose, CA 95113": { lat: 37.3340, lng: -121.8890 },
};

export default function IncidentDetail({ incidentId, onClose, onRouteReady }: IncidentDetailProps) {
  const [showDispatch, setShowDispatch] = useState(false);

  const { data: incident, isLoading, refetch } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: () => fetchIncident(incidentId),
    enabled: !!incidentId,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ff2d2d] border-t-transparent" />
      </div>
    );
  }

  if (!incident) return null;

  const severityColor = SEVERITY_COLORS[incident.severity] ?? "#888";
  const canDispatch = ["open", "triaged"].includes(incident.status);
  const incidentCoords = INCIDENT_COORDS[incident.address] ?? { lat: 37.3382, lng: -121.8863 };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1a1a1e] px-4 py-3">
        <h2 className="text-sm font-semibold capitalize text-white">
          {incident.type?.replace(/_/g, " ")}
        </h2>
        <button onClick={onClose} className="rounded p-1 text-[#888] hover:bg-[#1a1a1e]">
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Severity + Status */}
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: `${severityColor}20`, color: severityColor }}
          >
            {incident.severity}
          </span>
          <span className="rounded-full bg-[#888]/10 px-3 py-1 text-xs text-[#888]">
            {incident.status?.replace(/_/g, " ")}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-[#ccc]">{incident.description}</p>

        {/* Info rows */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-[#888]">
            <MapPin size={14} />
            <span>{incident.address}</span>
          </div>
          {incident.reporter_name && (
            <div className="flex items-center gap-2 text-xs text-[#888]">
              <User size={14} />
              <span>{incident.reporter_name}</span>
            </div>
          )}
          {incident.reporter_phone && (
            <div className="flex items-center gap-2 text-xs text-[#888]">
              <Phone size={14} />
              <span>{incident.reporter_phone}</span>
            </div>
          )}
          {incident.hazards?.length > 0 && (
            <div className="flex items-start gap-2 text-xs text-[#888]">
              <AlertTriangle size={14} className="mt-0.5" />
              <span>{incident.hazards.join(", ")}</span>
            </div>
          )}
        </div>

        {/* AI Triage */}
        {incident.triage && (
          <div className="rounded-lg border border-[#1a1a1e] bg-[#121214] p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#ccc]">
              <Brain size={14} className="text-[#ff7b1c]" />
              AI Triage
              <span className="ml-auto text-[#555]">
                {Math.round(incident.triage.confidence * 100)}% confidence
              </span>
            </div>
            <p className="text-xs text-[#888]">{incident.triage.reasoning}</p>
            <div className="flex flex-wrap gap-1">
              {incident.triage.recommended_vehicles?.map((v: string) => (
                <span key={v} className="rounded bg-[#1a1a1e] px-2 py-0.5 text-[10px] text-[#ccc]">
                  {v}
                </span>
              ))}
              <span className="rounded bg-[#1a1a1e] px-2 py-0.5 text-[10px] text-[#ccc]">
                crew: {incident.triage.recommended_crew_size}
              </span>
            </div>
            <p className="text-[10px] text-[#555]">
              {incident.triage.model} · {incident.triage.latency_ms}ms
            </p>
          </div>
        )}

        {/* Dispatches */}
        {incident.dispatches?.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider">Dispatched Units</h3>
            {incident.dispatches.map((d: Record<string, unknown>) => (
              <div key={d.id as string} className="rounded-lg border border-[#1a1a1e] bg-[#121214] p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#ccc]">Vehicle: {d.vehicle_id as string}</span>
                  <span className="rounded bg-[#3ddc84]/10 px-2 py-0.5 text-[#3ddc84]">
                    {(d.status as string)?.replace(/_/g, " ")}
                  </span>
                </div>
                {d.eta_seconds && (
                  <p className="mt-1 text-[10px] text-[#555]">
                    ETA: {Math.round((d.eta_seconds as number) / 60)} min · {Math.round((d.distance_m as number) / 1000 * 10) / 10} km
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dispatch button */}
        {canDispatch && (
          <button
            onClick={() => setShowDispatch(true)}
            className="w-full rounded-md bg-[#ff2d2d] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e02525] flex items-center justify-center gap-2"
          >
            <Radio size={16} />
            Dispatch Resources
          </button>
        )}
      </div>

      {/* Dispatch Modal */}
      <DispatchModal
        isOpen={showDispatch}
        incidentId={incidentId}
        incidentAddress={incident.address}
        incidentCoords={incidentCoords}
        onClose={() => setShowDispatch(false)}
        onDispatched={() => {
          setShowDispatch(false);
          refetch();
        }}
      />
    </div>
  );
}
