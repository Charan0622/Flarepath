"use client";

import { useQuery } from "@tanstack/react-query";
import { X, Brain, MapPin, Phone, User, AlertTriangle } from "lucide-react";

interface IncidentDetailProps {
  incidentId: string;
  onClose: () => void;
}

async function fetchIncident(id: string) {
  const res = await fetch(`/api/incidents/${id}`);
  const json = await res.json();
  return json.data;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff2d2d", high: "#ff7b1c", medium: "#ffc93c", low: "#3ddc84",
};

export default function IncidentDetail({ incidentId, onClose }: IncidentDetailProps) {
  const { data: incident, isLoading } = useQuery({
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
      </div>
    </div>
  );
}
