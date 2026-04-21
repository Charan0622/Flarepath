"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Radio, ArrowRight } from "lucide-react";
import { MemberProvider, useMember, useChiefMirror } from "@/lib/member-store";
import { useUnit } from "@/lib/crew-store";
import { displayNameFor } from "@/lib/crew-data";
import AvatarGauge from "@/components/unit/AvatarGauge";
import LowAirBanner from "@/components/unit/LowAirBanner";
import MemberMaydayCurtain from "@/components/unit/MemberMaydayCurtain";
import MemberPARAmber from "@/components/unit/MemberPARAmber";
import AssignmentBurst from "@/components/unit/AssignmentBurst";
import OrderStream from "@/components/unit/OrderStream";
import SceneMiniMap from "@/components/unit/SceneMiniMap";
import ActionDock from "@/components/unit/ActionDock";
import ObjectiveChecklist from "@/components/unit/ObjectiveChecklist";
import MemberHeader from "@/components/unit/MemberHeader";
import BuddyPicker from "@/components/unit/BuddyPicker";
import TurnByTurnTile from "@/components/unit/TurnByTurnTile";
import HydrantCard from "@/components/unit/HydrantCard";
import CrewChatter from "@/components/unit/CrewChatter";
import EvidenceCapture from "@/components/unit/EvidenceCapture";
import CrewMiniConstellation from "@/components/unit/CrewMiniConstellation";
import VoiceCommandOverlay from "@/components/unit/VoiceCommandOverlay";
import ChiefPTTAura from "@/components/unit/ChiefPTTAura";
import { synthesizeBiometric } from "@/lib/chief-data";

interface UnitData {
  dispatch: {
    id: string; status: string;
    assigned_at: string | null; en_route_at: string | null;
    on_scene_at: string | null; completed_at: string | null;
    eta_seconds: number | null; distance_m: number | null;
    route_geojson: GeoJSON.LineString | null;
  };
  incident: {
    id: string; type: string; severity: string; status: string;
    address: string; created_at: string;
    description: string | null; hazards: string[];
    coords: [number, number] | null;
  };
  vehicle: { id: string; call_sign: string; type: string; station_id: string | null };
  station: { id: string; name: string; address: string; coords: [number, number] | null } | null;
}

async function fetchUnit(dispatchId: string): Promise<UnitData> {
  const res = await fetch(`/api/unit/${dispatchId}`);
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data as UnitData;
}

export default function UnitMemberPage({ params }: { params: { dispatchId: string } }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["unit", params.dispatchId],
    queryFn: () => fetchUnit(params.dispatchId),
    refetchInterval: 10_000,
  });

  return (
    <MemberProvider dispatchId={params.dispatchId}>
      <Shell data={data} isLoading={isLoading} isError={isError} error={error as Error | null} />
    </MemberProvider>
  );
}

function Shell({
  data, isLoading, isError, error,
}: { data: UnitData | undefined; isLoading: boolean; isError: boolean; error: Error | null }) {
  const unit = useUnit(data?.vehicle.call_sign ?? null);
  const mirror = useChiefMirror(data?.dispatch.id ?? "");
  const { state, setBadge, setBuddy, setStatus, ackPAR } = useMember();
  const [maydayOpen, setMaydayOpen] = useState(false);
  const [buddyOpen, setBuddyOpen] = useState(false);
  const [captainBearing, setCaptainBearing] = useState<number | null>(null);
  const [captainDistance, setCaptainDistance] = useState<number | null>(null);

  // Pick the first non-captain member as "me" by default (demo). In prod we'd
  // map the logged-in user to their badge.
  useEffect(() => {
    if (state.badge || !unit) return;
    const self = unit.members[0];
    if (self) setBadge(self.badge);
  }, [unit, state.badge, setBadge]);

  const me = useMemo(() => {
    if (!unit || !state.badge) return null;
    if (unit.captain?.badge === state.badge) return { ...unit.captain, isCaptain: true };
    const m = unit.members.find((x) => x.badge === state.badge);
    return m ? { ...m, isCaptain: false } : null;
  }, [unit, state.badge]);

  // Latest assignment for me from the chief's mirror — synthesise `id`
  // from badge + assigned_at since assignments aren't persisted with UUIDs.
  const myOrders = useMemo(() => {
    if (!me) return [];
    return (mirror.assignments ?? [])
      .filter((a) => a.badge === me.badge)
      .map((a) => ({ id: `${a.badge}@${a.assigned_at}`, task: a.task, position: a.position, assigned_at: a.assigned_at }));
  }, [mirror.assignments, me]);

  const latestOrder = useMemo(() => {
    if (myOrders.length === 0) return null;
    return [...myOrders].sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())[0];
  }, [myOrders]);

  // Synthesised biometrics for the air ring / banner
  const bio = me ? synthesizeBiometric(me.badge, latestOrder?.task === "rit_standby" ? "rit" : latestOrder ? "interior" : state.status === "en_route" ? "en_route" : "staged") : null;
  const airPct = bio ? Math.max(0, Math.min(100, (bio.air_psi / 4500) * 100)) : 100;

  // PAR — mirror from chief
  const activePAR = mirror.parChecks.find((p) => !p.completed_at) ?? null;

  // Low-air heartbeat haptic — two-beat pattern when SCBA ≤ 33%, ramps up ≤ 15%
  useEffect(() => {
    if (!bio) return;
    if (airPct > 33) return;
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    const critical = airPct < 15;
    const fire = () => navigator.vibrate([60, 120, 60, critical ? 300 : 1200]);
    fire();
    const id = setInterval(fire, critical ? 1600 : 3600);
    return () => clearInterval(id);
  }, [airPct, bio]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState msg={error?.message ?? "Failed to load"} />;
  if (!data || !unit || !me) return <EmptyState />;

  const buddy = state.buddyBadge ? unit.members.find((m) => m.badge === state.buddyBadge) : null;
  const onScene = state.status === "on_scene" || !!data.dispatch.on_scene_at;

  return (
    <div className={`h-full w-full flex flex-col relative overflow-hidden ${state.smokeMode ? "smoke-mode" : ""}`}>
      {/* Severity-tinted chrome */}
      <SeverityChrome severity={data.incident.severity} />

      {/* Header: chief link + compass + buddy + clock */}
      <MemberHeader
        memberName={me.name}
        callSign={data.vehicle.call_sign}
        captain={unit.captain}
        members={unit.members}
        memberBadge={me.badge}
        captainBearing={captainBearing}
        captainDistance={captainDistance}
        onPickBuddy={() => setBuddyOpen(true)}
        buddyName={buddy?.name ?? null}
      />

      {/* Chief PTT aura — shows when captain transmits */}
      <ChiefPTTAura captainName={unit.captain?.name ?? "Captain"} />

      {/* Main scrolling content */}
      <main className={`flex-1 min-h-0 overflow-y-auto relative pb-[112px] ${airPct <= 33 ? "low-air-pulse" : ""}`}>
        {/* Low-air banner (sticky at top) */}
        {bio && <LowAirBanner airPct={airPct} secondsToEmpty={bio.air_time_remaining_s} />}

        {/* Identity strip with Avatar Gauge */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <AvatarGauge
            badge={me.badge}
            name={me.name}
            isCaptain={me.isCaptain}
            activity={latestOrder?.task === "rit_standby" ? "rit" : latestOrder ? "interior" : "en_route"}
            size={110}
          />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: "#71717a" }}>You</div>
            <div className="text-[20px] font-bold tracking-tight text-white truncate">{me.name}</div>
            <div className="text-[11px]" style={{ color: "#a1a1aa" }}>{me.rank}</div>
            <div className="text-[10px] font-mono mt-1" style={{ color: "#52525b" }}>
              {me.badge} · {displayNameFor(data.vehicle.call_sign)}
            </div>
          </div>
        </div>

        {/* Turn-by-turn navigation tile — prominent when en-route, shrinks on scene */}
        <div className="mb-3">
          <TurnByTurnTile
            routeGeoJSON={data.dispatch.route_geojson}
            etaSeconds={data.dispatch.eta_seconds}
            distanceM={data.dispatch.distance_m}
            onScene={onScene}
            address={data.incident.address}
          />
        </div>

        {/* Assignment burst */}
        <AssignmentBurst
          latest={latestOrder}
          captainName={unit.captain?.name ?? "Captain"}
          captainBadge={unit.captain?.badge ?? ""}
          memberName={me.name}
        />

        {/* Objective checklist */}
        <div className="mt-3">
          <ObjectiveChecklist task={latestOrder?.task ?? null} />
        </div>

        {/* Scene mini-map */}
        <div className="mt-4 px-3">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Radio size={11} style={{ color: "#60a5fa" }} />
            <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#a1a1aa" }}>Scene Tactical</span>
          </div>
          <div style={{ height: 340 }}>
            <SceneMiniMap
              incidentCoords={data.incident.coords}
              stationCoords={data.station?.coords ?? null}
              routeGeoJSON={data.dispatch.route_geojson}
              captain={unit.captain}
              members={unit.members}
              memberBadge={me.badge}
              buddyBadge={state.buddyBadge}
              onBearingUpdate={(b, d) => { setCaptainBearing(b); setCaptainDistance(d); }}
              assignedTask={latestOrder?.task ?? null}
            />
          </div>
        </div>

        {/* Nearest hydrants */}
        <div className="mt-4">
          <HydrantCard incidentCoords={data.incident.coords} />
        </div>

        {/* Crew constellation — live orbital squad view */}
        <div className="mt-4">
          <CrewMiniConstellation
            captain={unit.captain}
            members={unit.members}
            memberBadge={me.badge}
            buddyBadge={state.buddyBadge}
            onSelectBuddy={(badge) => setBuddy(badge)}
          />
        </div>

        {/* Engine-company chatter */}
        <div className="mt-4">
          <CrewChatter
            memberName={me.name}
            memberBadge={me.badge}
            members={unit.members}
            captain={unit.captain}
            callSign={data.vehicle.call_sign}
          />
        </div>

        {/* Evidence capture + pre-plan */}
        <div className="mt-4">
          <EvidenceCapture
            incidentAddress={data.incident.address}
            incidentCoords={data.incident.coords}
          />
        </div>

        {/* Incident summary strip */}
        <div className="mt-4 px-3">
          <div
            className="rounded-xl p-3 flex items-start gap-2"
            style={{
              background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <AlertTriangle size={14} style={{ color: "#ef4444" }} className="mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-white capitalize">
                {data.incident.type.replace(/_/g, " ")} · <span style={{ color: "#ef4444" }} className="uppercase">{data.incident.severity}</span>
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: "#d4d4d8" }}>
                {data.incident.address.split(",")[0]}
              </div>
              {data.incident.description && (
                <div className="text-[10px] mt-1 leading-relaxed" style={{ color: "#a1a1aa" }}>
                  {data.incident.description}
                </div>
              )}
              {data.incident.hazards && data.incident.hazards.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {data.incident.hazards.map((h) => (
                    <span key={h} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Orders log */}
        <div className="mt-4">
          <OrderStream orders={myOrders} latestId={latestOrder?.id ?? null} />
        </div>

        {/* Action trail */}
        <div className="mt-4 mx-3 mb-4">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <ArrowRight size={11} style={{ color: "#71717a" }} />
            <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#a1a1aa" }}>My Actions</span>
          </div>
          <div
            className="rounded-lg p-2 space-y-0.5 max-h-[160px] overflow-auto"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.04)" }}
          >
            {state.trail.length === 0 ? (
              <div className="text-[10px] italic px-2 py-1" style={{ color: "#52525b" }}>No actions yet.</div>
            ) : (
              [...state.trail].slice(-15).reverse().map((ev, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px] font-mono">
                  <span className="tabular-nums shrink-0" style={{ color: "#52525b" }}>
                    {new Date(ev.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                  </span>
                  <span style={{ color: "#71717a" }}>·</span>
                  <span className="flex-1 truncate" style={{ color: "#a1a1aa" }}>{ev.kind.replace(/_/g, " ")}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* PAR amber sweep (full-screen) */}
      <MemberPARAmber
        parId={activePAR?.initiated_at ?? null}
        initiatedAt={activePAR?.initiated_at ?? null}
      />

      {/* Thumb-zone action dock */}
      <ActionDock onMayday={() => setMaydayOpen(true)} />

      {/* Mayday LUNAR curtain */}
      <MemberMaydayCurtain
        open={maydayOpen}
        onClose={() => setMaydayOpen(false)}
        memberBadge={me.badge}
        memberName={me.name}
        unit={data.vehicle.call_sign}
      />

      {/* Buddy picker */}
      <BuddyPicker open={buddyOpen} onClose={() => setBuddyOpen(false)} members={unit.members} selfBadge={me.badge} />

      {/* Voice command orb — long-press mic, Whisper intents */}
      <VoiceCommandOverlay
        onIntent={(action) => {
          if (action === "raise_mayday") setMaydayOpen(true);
          else if (action === "ack_par" && activePAR) ackPAR(activePAR.initiated_at);
          else if (action === "status_on_scene") setStatus("on_scene");
        }}
      />
    </div>
  );
}

function SeverityChrome({ severity }: { severity: string }) {
  const color = severity === "critical" ? "#ef4444" : severity === "high" ? "#f97316" : severity === "medium" ? "#eab308" : "#22c55e";
  return (
    <>
      <div className="absolute top-0 left-0 right-0 h-1 z-50 pointer-events-none" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
      <div className="absolute bottom-0 left-0 right-0 h-0.5 z-50 pointer-events-none" style={{ background: color }} />
    </>
  );
}

function LoadingState() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ef4444] border-t-transparent" />
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="inline-flex w-12 h-12 rounded-full items-center justify-center mb-4"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <AlertTriangle size={20} style={{ color: "#ef4444" }} />
        </div>
        <h2 className="text-[15px] font-semibold text-white mb-1">Couldn&apos;t load your HUD</h2>
        <p className="text-[12px]" style={{ color: "#a1a1aa" }}>{msg}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full w-full flex items-center justify-center p-6 text-center">
      <div>
        <Radio size={22} className="mx-auto mb-3" style={{ color: "#71717a" }} />
        <p className="text-[13px] text-white mb-1">Standing by</p>
        <p className="text-[11px]" style={{ color: "#a1a1aa" }}>No active dispatch. Command will page you.</p>
      </div>
    </div>
  );
}
