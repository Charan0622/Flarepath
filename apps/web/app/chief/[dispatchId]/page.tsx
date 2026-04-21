"use client";

import { useMemo, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Sparkles, Building2, ListChecks,
  Users, History, Activity, CheckCircle2, FileText, Loader2, X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ChiefProvider, useChief } from "@/lib/chief-store";
import { useUnit } from "@/lib/crew-store";
import { displayNameFor } from "@/lib/crew-data";
import { TASKS, POSITIONS } from "@/lib/chief-data";

import ChiefHeader from "@/components/chief/ChiefHeader";
import ChiefSideRail, { type ChiefView } from "@/components/chief/ChiefSideRail";
import DispatcherTether from "@/components/chief/DispatcherTether";
import CrewConstellation from "@/components/chief/CrewConstellation";
import TacticalCanvas from "@/components/chief/TacticalCanvas";
import BenchmarkLadder from "@/components/chief/BenchmarkLadder";
import AssignmentBoard from "@/components/chief/AssignmentBoard";
import PrePlanCard from "@/components/chief/PrePlanCard";
import WaterSupplyGauge from "@/components/chief/WaterSupplyGauge";
import GeminiBriefing from "@/components/chief/GeminiBriefing";
import LUNARCurtain from "@/components/chief/LUNARCurtain";
import RITTile from "@/components/chief/RITTile";
import TacticalRadioStrip from "@/components/chief/TacticalRadioStrip";
import VitalsPanel from "@/components/chief/VitalsPanel";
import CrewProfilesView from "@/components/chief/CrewProfilesView";
import DispatcherInboxView from "@/components/chief/DispatcherInboxView";

interface ChiefData {
  dispatch: {
    id: string; status: string;
    assigned_at: string | null; acknowledged_at: string | null;
    en_route_at: string | null; on_scene_at: string | null; completed_at: string | null;
    eta_seconds: number | null; distance_m: number | null;
    route_geojson: GeoJSON.LineString | null;
  };
  incident: {
    id: string; type: string; severity: string; status: string;
    address: string; created_at: string;
    description: string | null; hazards: string[];
    reporter_name: string | null; reporter_phone: string | null;
    coords: [number, number] | null;
  };
  vehicle: { id: string; call_sign: string; type: string; station_id: string | null };
  station: { id: string; name: string; address: string; coords: [number, number] | null } | null;
  triage: { predicted_severity: string; confidence: number; reasoning: string } | null;
}

async function fetchChief(dispatchId: string): Promise<ChiefData> {
  const res = await fetch(`/api/chief/${dispatchId}`);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data as ChiefData;
}

export default function ChiefPage({ params }: { params: { dispatchId: string } }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["chief", params.dispatchId],
    queryFn: () => fetchChief(params.dispatchId),
    refetchInterval: 10_000,
  });

  return (
    <ChiefProvider dispatchId={params.dispatchId}>
      <Shell data={data} isLoading={isLoading} isError={isError} error={error as Error | null} />
    </ChiefProvider>
  );
}

function Shell({
  data, isLoading, isError, error,
}: { data: ChiefData | undefined; isLoading: boolean; isError: boolean; error: Error | null }) {
  const router = useRouter();
  const unit = useUnit(data?.vehicle.call_sign ?? null);
  const { state } = useChief();
  const [view, setView] = useState<ChiefView>("command");
  const [maydayOpen, setMaydayOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const activePar = state.parChecks.find((p) => !p.completed_at);

  const derived = useMemo(() => {
    if (!data) return null;
    return {
      incidentType: data.incident.type,
      incidentAddress: data.incident.address,
      severity: data.incident.severity,
      etaSecs: data.dispatch.eta_seconds ?? 360,
      reasoning: data.triage?.reasoning ?? null,
    };
  }, [data]);

  async function buildReport() {
    if (!data || !unit) return null;
    const crewPayload = [
      ...(unit.captain ? [{ ...unit.captain, role: "captain" as const }] : []),
      ...unit.members.map((m) => ({ ...m, role: "member" as const })),
    ];
    const body = {
      timeline: state.timeline,
      crew: crewPayload,
      sizeUp: state.sizeUp,
      benchmarks: state.benchmarks,
      assignments: state.assignments,
      waterSupply: state.waterSupply,
      mayday: state.mayday,
    };
    return fetch(`/api/chief/${data.dispatch.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function resolveIncident(alsoExport: boolean) {
    if (!data) return;
    setResolving(true);
    try {
      // 1) Optionally open the AI-generated PDF report in a new tab FIRST
      // (browser auto-print will fire on load).
      if (alsoExport) {
        const res = await buildReport();
        if (res && res.ok) {
          const html = await res.text();
          const blob = new Blob([html], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank", "noopener,noreferrer");
          setTimeout(() => URL.revokeObjectURL(url), 30_000);
        } else {
          alert("Couldn't generate report — resolving anyway.");
        }
      }

      // 2) Resolve the incident (cascades dispatches + frees vehicles)
      const res = await fetch(`/api/incidents/${data.incident.id}/resolve`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setResolveOpen(false);
      router.push("/chief");
    } catch (err) {
      alert(`Couldn't resolve incident: ${(err as Error).message}`);
    } finally {
      setResolving(false);
    }
  }

  // Inbox badge = new broadcasts since last visit (simple count of dispatcher events we'd surface)
  const inboxBadge = state.orderAcknowledged ? 0 : 1;

  return (
    <div className="h-full w-full flex relative overflow-hidden">
      {/* Side rail (dedicated chief nav) */}
      <ChiefSideRail active={view} onChange={setView} inboxBadge={inboxBadge} />

      {/* Content column */}
      <div className="flex-1 min-w-0 flex flex-col relative overflow-hidden">
        {/* Header */}
        {data && unit ? (
          <ChiefHeader
            callSignDisplay={displayNameFor(data.vehicle.call_sign)}
            callSignRaw={data.vehicle.call_sign}
            unitType={data.vehicle.type}
            stationName={data.station?.name ?? null}
            captain={unit.captain}
            radioChannel={unit.radio_channel}
            onSceneAt={data.dispatch.on_scene_at}
            onOpenMayday={() => setMaydayOpen(true)}
            onRequestClose={() => setResolveOpen(true)}
            maydayActive={!!state.mayday && !state.mayday.resolved_at}
          />
        ) : (
          <HeaderPlaceholder />
        )}

        {/* View switcher */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Command Deck — focused on map + crew + dispatcher tether */}
          {view === "command" && (
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <div className="flex flex-col gap-3 p-3" style={{ minHeight: "100%" }}>
                {data && derived && (
                  <DispatcherTether
                    incidentType={derived.incidentType}
                    incidentAddress={derived.incidentAddress}
                    severity={derived.severity}
                    etaSeconds={derived.etaSecs}
                  />
                )}
                <div className="grid gap-3 flex-1" style={{ gridTemplateColumns: "minmax(480px, 58%) minmax(360px, 42%)", minHeight: 540 }}>
                  {isLoading ? <LoadingState />
                    : isError ? <ErrorState msg={error?.message ?? "Failed to load"} />
                    : !data || !derived || !unit ? <EmptyState />
                    : (
                      <>
                        <TacticalCanvas
                          incidentCoords={data.incident.coords}
                          stationCoords={data.station?.coords ?? null}
                          routeGeoJSON={data.dispatch.route_geojson}
                          incidentAddress={data.incident.address}
                          severity={data.incident.severity}
                          unitCallSign={data.vehicle.call_sign}
                        />
                        <div className="glass-card rounded-xl p-3 flex flex-col min-h-0 overflow-hidden" style={{ minHeight: 540 }}>
                          <div className="flex items-center justify-between mb-2 shrink-0">
                            <div className="flex items-center gap-2">
                              <Users size={12} style={{ color: "#eab308" }} />
                              <span className="text-[11px] font-semibold text-white">Crew · Orbital Command</span>
                            </div>
                            <span className="text-[9px]" style={{ color: "#71717a" }}>click avatar to assign</span>
                          </div>
                          <div className="flex-1 min-h-0 relative" style={{ minHeight: 400 }}>
                            <CrewConstellation captain={unit.captain} members={unit.members} />
                          </div>
                          <div className="mt-2 shrink-0">
                            <TacticalRadioStrip members={unit.members} channel={unit.radio_channel} />
                          </div>
                        </div>
                      </>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Full-page views */}
          {view === "crew" && data && unit && (
            <CrewProfilesView
              captain={unit.captain}
              members={unit.members}
              unitCallSign={data.vehicle.call_sign}
              unitDisplayName={displayNameFor(data.vehicle.call_sign)}
              stationName={data.station?.name ?? null}
              radioChannel={unit.radio_channel}
              shift={unit.shift}
            />
          )}

          {view === "inbox" && data && derived && (
            <DispatcherInboxView
              dispatchId={data.dispatch.id}
              incidentId={data.incident.id}
              incidentType={derived.incidentType}
              incidentAddress={derived.incidentAddress}
              severity={derived.severity}
              etaSeconds={derived.etaSecs}
              onSceneAt={data.dispatch.on_scene_at}
              triageReasoning={derived.reasoning}
            />
          )}

          {view === "briefing" && data && derived && (
            <ViewFrame icon={Sparkles} accent="#a855f7" title="AI Tactical Briefing" subtitle="Gemini-generated, validated against triage · pre-plan · weather · hazards">
              <GeminiBriefing
                incidentType={derived.incidentType}
                incidentAddress={derived.incidentAddress}
                severity={derived.severity}
                hazards={data.incident.hazards ?? []}
                reasoning={derived.reasoning}
              />
            </ViewFrame>
          )}

          {view === "preplan" && data && (
            <ViewFrame icon={Building2} accent="#3b82f6" title="Pre-Incident Plan" subtitle="Occupancy · construction · hazards · utilities · Knox-box">
              <PrePlanCard address={data.incident.address} />
            </ViewFrame>
          )}

          {view === "benchmarks" && unit && (
            <ViewFrame icon={ListChecks} accent="#22c55e" title="ICS Benchmarks" subtitle="Tactical checkpoints · water supply · RIT compliance">
              <div className="grid grid-cols-[1fr_minmax(260px,380px)] gap-4">
                <BenchmarkLadder />
                <div className="space-y-3">
                  <WaterSupplyGauge />
                  <RITTile members={unit.members} />
                </div>
              </div>
            </ViewFrame>
          )}

          {view === "vitals" && unit && (
            <ViewFrame icon={Activity} accent="#ef4444" title="Crew Vitals" subtitle="HR · core temp · SCBA air · radio · activity state">
              <VitalsPanel captain={unit.captain} members={unit.members} />
            </ViewFrame>
          )}

          {view === "assignments" && unit && (
            <ViewFrame icon={Users} accent="#eab308" title="ICS Assignments" subtitle="Who is working which position right now">
              <AssignmentBoard captain={unit.captain} members={unit.members} />
            </ViewFrame>
          )}

          {view === "timeline" && (
            <ViewFrame icon={History} accent="#71717a" title="Incident Timeline" subtitle="Every ack, size-up, benchmark, assignment, PAR, and mayday">
              <Timeline events={state.timeline} />
            </ViewFrame>
          )}
        </div>

        {/* Resolve confirmation dialog */}
        {data && (
          <ResolveDialog
            open={resolveOpen}
            busy={resolving}
            incidentAddress={data.incident.address}
            incidentType={data.incident.type}
            timelineCount={state.timeline.length}
            onCancel={() => setResolveOpen(false)}
            onConfirm={(alsoExport) => resolveIncident(alsoExport)}
          />
        )}

        {/* LUNAR Mayday curtain — opens directly on header MAYDAY click */}
        {data && unit && (
          <LUNARCurtain
            open={maydayOpen}
            onClose={() => setMaydayOpen(false)}
            unit={data.vehicle.call_sign}
            captain={unit.captain}
            members={unit.members}
          />
        )}

        {activePar && <PARUrgencyVignette initiated={activePar.initiated_at} />}
      </div>
    </div>
  );
}

function ResolveDialog({
  open, busy, incidentType, incidentAddress, timelineCount, onCancel, onConfirm,
}: {
  open: boolean; busy: boolean; incidentType: string; incidentAddress: string; timelineCount: number;
  onCancel: () => void;
  onConfirm: (alsoExport: boolean) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={busy ? undefined : onCancel}
        >
          <div className="absolute inset-0"
            style={{ background: "rgba(4,4,8,0.6)", backdropFilter: "blur(14px) saturate(130%)" }}
          />
          <motion.div
            role="dialog" aria-modal="true"
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong relative rounded-2xl w-full max-w-md p-6"
            style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 0 40px rgba(34,197,94,0.12)" }}
          >
            <button className="absolute top-3 right-3 p-1 rounded hover:bg-white/[0.05]" onClick={onCancel} disabled={busy}>
              <X size={14} style={{ color: "#a1a1aa" }} />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)" }}>
                <CheckCircle2 size={18} style={{ color: "#22c55e" }} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-white">Resolve incident?</h2>
                <p className="text-[10px]" style={{ color: "#71717a" }}>
                  {incidentType.replace(/_/g, " ")} · {incidentAddress.split(",")[0]}
                </p>
              </div>
            </div>

            <div className="rounded-lg p-3 mb-4 space-y-1.5 text-[11px]"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", color: "#a1a1aa" }}>
              <div>• All assigned units return to <span className="text-[#22c55e] font-semibold">available</span> status.</div>
              <div>• The incident is marked <span className="text-[#22c55e] font-semibold">resolved</span>.</div>
              <div>• Dispatcher gets a live notification.</div>
              <div>• AI generates an ICS-201 narrative PDF ({timelineCount} timeline events included).</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onConfirm(false)} disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
              >
                {busy ? <><Loader2 size={12} className="animate-spin" /> Resolving…</> : <><CheckCircle2 size={12} /> Resolve</>}
              </button>
              <button
                onClick={() => onConfirm(true)} disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
              >
                <FileText size={12} /> Resolve &amp; Generate PDF
              </button>
              <button
                onClick={onCancel} disabled={busy}
                className="rounded-md px-3 py-2 text-[11px] border border-white/[0.08] disabled:opacity-50"
                style={{ color: "#a1a1aa" }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ViewFrame({
  icon: Icon, accent, title, subtitle, children,
}: {
  icon: typeof Sparkles; accent: string; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="px-6 py-4 glass-divider-b flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accent}22`, border: `1px solid ${accent}55`, boxShadow: `0 0 14px ${accent}28` }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
        <div>
          <h2 className="text-[14px] font-bold text-white tracking-tight">{title}</h2>
          <p className="text-[11px]" style={{ color: "#71717a" }}>{subtitle}</p>
        </div>
      </header>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">{children}</div>
      </div>
    </div>
  );
}

function Timeline({ events }: { events: { ts: string; kind: string; payload: Record<string, unknown> }[] }) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[11px]" style={{ color: "#52525b" }}>
        No events yet. Ack the order, set size-up sides, check benchmarks — every action logs here and becomes the ICS-201 PDF.
      </div>
    );
  }
  const ordered = [...events].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  return (
    <div className="space-y-1.5">
      {ordered.map((e, i) => (
        <div key={i} className="flex items-start gap-2 text-[10.5px]">
          <span className="text-[9px] font-mono tabular-nums shrink-0 mt-0.5" style={{ color: "#52525b", minWidth: 56 }}>
            {new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
          </span>
          <span className="px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wider shrink-0"
            style={{
              background: e.kind.includes("mayday") ? "rgba(239,68,68,0.2)"
                : e.kind.includes("par") ? "rgba(234,179,8,0.15)"
                : e.kind.includes("benchmark") ? "rgba(34,197,94,0.15)"
                : e.kind.includes("assign") ? "rgba(249,115,22,0.15)"
                : "rgba(255,255,255,0.05)",
              color: e.kind.includes("mayday") ? "#ef4444"
                : e.kind.includes("par") ? "#eab308"
                : e.kind.includes("benchmark") ? "#22c55e"
                : e.kind.includes("assign") ? "#f97316"
                : "#a1a1aa",
            }}
          >
            {e.kind.replace(/_/g, " ")}
          </span>
          <span style={{ color: "#a1a1aa" }}>{describePayload(e.kind, e.payload)}</span>
        </div>
      ))}
    </div>
  );
}

function describePayload(kind: string, payload: Record<string, unknown>): string {
  if (kind === "benchmark") return `${String(payload.key).replace(/_/g, " ")}`;
  if (kind === "benchmark_uncleared") return `un-cleared ${String(payload.key).replace(/_/g, " ")}`;
  if (kind === "size_up") return `Side ${payload.side} → ${payload.state}`;
  if (kind === "assignment") {
    const task = TASKS.find((t) => t.key === payload.task);
    const pos = POSITIONS.find((p) => p.key === payload.position);
    return `${String(payload.badge)} → ${task?.label ?? payload.task}${pos ? ` (${pos.short})` : ""}`;
  }
  if (kind === "unassigned") return `unassigned ${payload.badge}`;
  if (kind === "water_supply") return Object.entries(payload).map(([k, v]) => `${k}=${v}`).join(" · ");
  if (kind === "mayday_raised") return `${payload.name} · ${payload.location}`;
  if (kind === "mayday_resolved") return "all clear";
  if (kind === "par_initiated") return "PAR called";
  if (kind === "par_complete") return `${payload.responded} responded`;
  if (kind === "order_acknowledged") return "dispatcher order ack'd";
  return "";
}

function PARUrgencyVignette({ initiated }: { initiated: string }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - new Date(initiated).getTime();
      setRemaining(Math.max(0, 20 * 60 * 1000 - elapsed));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [initiated]);
  if (remaining > 30_000) return null;
  const intensity = remaining === 0 ? 0.35 : 0.18;
  return (
    <div className="fixed inset-0 pointer-events-none z-[40]"
      style={{ boxShadow: `inset 0 0 140px rgba(239,68,68,${intensity}), inset 0 0 320px rgba(239,68,68,${intensity / 2})` }}
    />
  );
}

function HeaderPlaceholder() {
  return <div className="glass-strip glass-divider-b" style={{ height: 56 }} />;
}

function LoadingState() {
  return (
    <div className="flex h-full items-center justify-center col-span-2">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ef4444] border-t-transparent" />
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="flex h-full items-center justify-center col-span-2">
      <div className="max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-full items-center justify-center mb-4"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <AlertTriangle size={20} style={{ color: "#ef4444" }} />
        </div>
        <h2 className="text-[14px] font-semibold text-white mb-1">Couldn&apos;t load chief view</h2>
        <p className="text-[11px]" style={{ color: "#a1a1aa" }}>{msg}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-[12px] col-span-2" style={{ color: "#71717a" }}>
      <div className="text-center max-w-md">
        No active dispatch assigned. Waiting for orders from command.
      </div>
    </div>
  );
}
