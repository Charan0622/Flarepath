"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { X, Brain, MapPin, Phone, User, AlertTriangle, Radio, FileText, CheckCircle2, Loader2 } from "lucide-react";
import DispatchModal from "./DispatchModal";
import IncidentChat from "./IncidentChat";
import { showToast } from "./Toast";
import { displayNameFor } from "@/lib/crew-data";

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
  const [resolving, setResolving] = useState(false);
  const [confirmResolve, setConfirmResolve] = useState(false);
  const qc = useQueryClient();

  const { data: incident, isLoading, refetch } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: () => fetchIncident(incidentId),
    enabled: !!incidentId,
  });

  async function handleResolve() {
    setResolving(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/resolve`, { method: "POST" });
      const json = await res.json();
      if (json.error) {
        showToast("error", json.error);
        return;
      }
      const units = json.data?.completed_dispatches ?? 0;
      showToast(
        "success",
        units > 0
          ? `Incident resolved — ${units} unit${units > 1 ? "s" : ""} cleared`
          : "Incident resolved"
      );
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("Flarepath — Situation resolved", {
          body: incident?.address ?? "Incident closed",
          icon: "/icons/icon-192.png",
          tag: `resolved-${incidentId}`,
        });
      }
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["active-dispatches"] });
      qc.invalidateQueries({ queryKey: ["incident", incidentId] });
      setConfirmResolve(false);
      onClose();
    } finally {
      setResolving(false);
    }
  }

  // Send route to parent for map rendering
  useEffect(() => {
    if (incident?.dispatches?.[0]?.route_geojson && onRouteReady) {
      onRouteReady(incident.dispatches[0].route_geojson);
    }
  }, [incident, onRouteReady]);

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
  const canResolve = !["resolved", "cancelled"].includes(incident.status);
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

        {/* Dispatched Units */}
        {incident.dispatches?.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider">Dispatched Units</h3>
            {incident.dispatches.map((d: Record<string, unknown>) => {
              const etaMin = d.eta_seconds ? Math.ceil((d.eta_seconds as number) / 60) : null;
              const distKm = d.distance_m ? ((d.distance_m as number) / 1000).toFixed(1) : null;
              const hasRoute = !!d.route_geojson;
              const statusStr = (d.status as string) ?? "assigned";
              const STATUS_COLORS: Record<string, string> = {
                assigned: "#ff2d2d", acknowledged: "#ff7b1c", en_route: "#ffc93c",
                on_scene: "#3ddc84", returning: "#3b82f6", completed: "#888",
              };
              const statusColor = STATUS_COLORS[statusStr] ?? "#888";

              return (
                <motion.div
                  key={d.id as string}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-white/5 bg-gradient-to-r from-[#121214] to-[#0a0a0b] p-3 space-y-2"
                >
                  {/* Vehicle + Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚒</span>
                      <div className="flex flex-col leading-tight">
                        <span className="text-xs font-semibold text-white">
                          {displayNameFor((d.vehicle as { call_sign?: string } | null)?.call_sign)
                            || (d.vehicle as { call_sign?: string } | null)?.call_sign
                            || "Unit"}
                        </span>
                        {(d.vehicle as { call_sign?: string } | null)?.call_sign && (
                          <span className="text-[9px]" style={{ color: "#71717a" }}>
                            {(d.vehicle as { call_sign: string }).call_sign}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase"
                      style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
                    >
                      {statusStr === "en_route" && (
                        <motion.span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: statusColor }}
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                      {statusStr.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Route info — the key data */}
                  {(etaMin || distKm) && (
                    <div className="flex items-center gap-4">
                      {etaMin && (
                        <div className="flex-1 rounded-lg bg-[#0a0a0b] p-2 text-center">
                          <div className="text-[10px] text-[#555] uppercase">ETA</div>
                          <div className="text-xl font-bold text-white">{etaMin}<span className="text-xs text-[#888] ml-0.5">min</span></div>
                        </div>
                      )}
                      {distKm && (
                        <div className="flex-1 rounded-lg bg-[#0a0a0b] p-2 text-center">
                          <div className="text-[10px] text-[#555] uppercase">Distance</div>
                          <div className="text-xl font-bold text-white">{distKm}<span className="text-xs text-[#888] ml-0.5">km</span></div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Route status */}
                  {hasRoute ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-[#3ddc84]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#3ddc84]" />
                      Shortest route computed via Mapbox Directions
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] text-[#ff7b1c]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ff7b1c]" />
                      Awaiting route computation
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {canDispatch && (
            <button
              onClick={() => setShowDispatch(true)}
              className="flex-1 rounded-md bg-[#ff2d2d] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e02525] flex items-center justify-center gap-2"
            >
              <Radio size={16} />
              Dispatch
            </button>
          )}
          {canResolve && !canDispatch && !confirmResolve && (
            <button
              onClick={() => setConfirmResolve(true)}
              className="flex-1 rounded-md bg-[#0a2a18] border border-[#3ddc84]/40 px-4 py-2.5 text-sm font-semibold text-[#3ddc84] transition-colors hover:bg-[#0e3a22] flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              Mark Resolved
            </button>
          )}
          <a
            href={`/api/incidents/${incidentId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-md border border-[#333] px-3 py-2.5 text-xs text-[#888] hover:text-white transition-colors"
          >
            <FileText size={14} />
            PDF
          </a>
        </div>

        {confirmResolve && (
          <div className="rounded-lg border border-[#3ddc84]/30 bg-[#0a1a12] p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#3ddc84]">
              <CheckCircle2 size={14} />
              Resolve this incident?
            </div>
            <p className="text-[11px] text-[#888]">
              All assigned units will be marked completed and returned to available status.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="flex-1 rounded-md bg-[#3ddc84] px-3 py-2 text-xs font-semibold text-[#04140c] hover:bg-[#2ec76f] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {resolving ? <><Loader2 size={12} className="animate-spin" />Resolving…</> : "Confirm resolve"}
              </button>
              <button
                onClick={() => setConfirmResolve(false)}
                disabled={resolving}
                className="rounded-md border border-[#333] px-3 py-2 text-xs text-[#888] hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chat */}
      <IncidentChat incidentId={incidentId} />

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
