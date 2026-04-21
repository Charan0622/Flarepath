"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Shield, Radio, AlertTriangle, Thermometer, Wind, Heart } from "lucide-react";
import type { CrewMember } from "@/lib/crew-data";
import { synthesizeBiometric, TASKS, type TaskKey, type IcsPosition } from "@/lib/chief-data";
import { useChief } from "@/lib/chief-store";

interface Props {
  captain: CrewMember | null;
  members: CrewMember[];
}

const STATUS_COLOR: Record<string, string> = {
  nominal: "#22c55e",
  elevated: "#eab308",
  warning: "#f97316",
  critical: "#ef4444",
};

function parDueIn(initiated_at: string): number {
  const windowMs = 20 * 60 * 1000;
  const elapsed = Date.now() - new Date(initiated_at).getTime();
  return Math.max(0, windowMs - elapsed);
}

export default function CrewConstellation({ captain, members }: Props) {
  const { state, assign, unassign, parRespond } = useChief();
  const [tick, setTick] = useState(0);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const activePar = state.parChecks.find((p) => !p.completed_at) ?? null;

  // 1 Hz tick — framer-motion drives the halo / pulse animations on its own
  // loop; React only needs to re-render when biometric-derived values
  // (air %, HR band, radio hot) change, which happens on the order of seconds.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const assignmentByBadge = useMemo(() => {
    const m = new Map<string, { task: TaskKey; position: IcsPosition }>();
    state.assignments.forEach((a) => m.set(a.badge, { task: a.task, position: a.position }));
    return m;
  }, [state.assignments]);

  const all = [captain, ...members].filter(Boolean) as CrewMember[];
  const count = all.length;

  const MEMBER_SIZE = 56;
  const CAPTAIN_SIZE = 76;

  // ESC closes task picker
  useEffect(() => {
    if (!pickerFor) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPickerFor(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerFor]);

  const parElapsedSec = activePar ? Math.floor((Date.now() - new Date(activePar.initiated_at).getTime()) / 1000) : 0;

  return (
    <div className="relative h-full w-full flex flex-col" style={{ minHeight: 380 }}>
      {/* PAR flash banner — triggers at start, fades with progress */}
      {activePar && parElapsedSec < 4 && (
        <motion.div
          className="absolute inset-0 z-[25] pointer-events-none rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 2.4, repeat: 1 }}
          style={{ background: "radial-gradient(circle, rgba(234,179,8,0.35), transparent 70%)" }}
        />
      )}
      {activePar && (
        <div
          className="absolute top-2 left-2 right-2 z-[26] flex items-center justify-center gap-2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: "rgba(234,179,8,0.18)",
            color: "#eab308",
            border: "1px solid rgba(234,179,8,0.5)",
            boxShadow: "0 0 14px rgba(234,179,8,0.35)",
          }}
        >
          <span className="relative w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-[#eab308] animate-ping opacity-60" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-[#eab308]" />
          </span>
          PAR in progress · {activePar.responded.length}/{members.length} acknowledged
        </div>
      )}

      {/* PAR Countdown Ring — shrinks over 20m around the whole constellation */}
      {activePar && <PARRing activePar={activePar} />}

      <div className="relative flex-1 flex items-center justify-center">
        <ConstellationSVG all={all} activeBadges={Array.from(assignmentByBadge.keys())} tick={tick} />

        {/* Captain in center */}
        {captain && (
          <div
            className="absolute"
            style={{
              left: `calc(50% - ${CAPTAIN_SIZE / 2}px)`,
              top: `calc(50% - ${CAPTAIN_SIZE / 2}px)`,
              width: CAPTAIN_SIZE, height: CAPTAIN_SIZE,
            }}
          >
            <CrewAvatar member={captain} leader tick={tick} activity="interior" />
          </div>
        )}

        {/* Orbiting members — outer wrapper anchored at 50%/50%, motion div
            animates x/y around it; avatar sits at top-left of that position,
            offset by half its size so it ends up centered. */}
        {members.map((m, i) => {
          const radius = 120;
          const angle = (i / Math.max(1, members.length)) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const activity = assignmentByBadge.get(m.badge)?.task === "rit_standby"
            ? "rit" : assignmentByBadge.has(m.badge) ? "interior" : "staged";
          const responded = !!activePar && activePar.responded.includes(m.badge);
          return (
            <motion.div
              key={m.badge}
              className="absolute"
              initial={{ opacity: 0, scale: 0.8, x: 0, y: 0 }}
              animate={{ opacity: 1, scale: 1, x, y }}
              transition={{
                type: "spring", stiffness: 110, damping: 22, delay: i * 0.04,
                opacity: { duration: 0.3 }, scale: { duration: 0.3 },
              }}
              style={{
                left: `calc(50% - ${MEMBER_SIZE / 2}px)`,
                top: `calc(50% - ${MEMBER_SIZE / 2}px)`,
                width: MEMBER_SIZE, height: MEMBER_SIZE,
              }}
            >
              <CrewAvatar
                member={m}
                tick={tick}
                activity={activity}
                assigned={assignmentByBadge.get(m.badge)}
                parResponded={responded}
                parActive={!!activePar}
                onClick={() => setPickerFor((id) => (id === m.badge ? null : m.badge))}
                onParAck={() => parRespond(m.badge)}
              />
            </motion.div>
          );
        })}

        {/* Assignment Rays — rendered as SVG lines from captain to each assigned crew */}
        {captain && assignmentByBadge.size > 0 && (
          <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }} viewBox="-200 -200 400 400" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ray-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.0" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            {members.map((m, i) => {
              if (!assignmentByBadge.has(m.badge)) return null;
              const radius = 120;
              const angle = (i / Math.max(1, members.length)) * Math.PI * 2 - Math.PI / 2;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <g key={m.badge}>
                  <motion.line
                    x1={0} y1={0} x2={x} y2={y}
                    stroke="url(#ray-gradient)" strokeWidth={1.6}
                    strokeDasharray="3 3"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.85, strokeDashoffset: -((tick * 1) % 80) }}
                    transition={{ pathLength: { duration: 0.45 }, opacity: { duration: 0.3 } }}
                  />
                </g>
              );
            })}
          </svg>
        )}

      </div>

      {/* Task picker — pinned inline sheet at the bottom of the crew card.
          Never overflows, clear label, ESC or X to close. */}
      <AnimatePresence>
        {pickerFor && (() => {
          const m = members.find((x) => x.badge === pickerFor);
          if (!m) return null;
          const current = assignmentByBadge.get(m.badge);
          return (
            <motion.div
              key={pickerFor}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="absolute left-2 right-2 bottom-2 glass-strong rounded-lg p-3 z-30"
              style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.55)", border: "1px solid rgba(234,179,8,0.25)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#eab308" }} />
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#eab308" }}>
                    Assign task to {m.name.split(" ")[0]} {m.name.split(" ").slice(-1)[0][0]}.
                  </span>
                </div>
                <button
                  onClick={() => setPickerFor(null)}
                  className="text-[9px] px-1.5 py-0.5 rounded hover:bg-white/[0.06]"
                  style={{ color: "#a1a1aa" }}
                >
                  ESC / close
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {TASKS.map((t) => {
                  const active = current?.task === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => { assign(m.badge, t.key, t.position); setPickerFor(null); }}
                      className="flex flex-col items-start gap-0.5 px-2 py-1.5 rounded transition-colors text-left"
                      style={{
                        background: active ? `${t.color}22` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${active ? t.color + "66" : "rgba(255,255,255,0.06)"}`,
                        color: active ? t.color : "#e4e4e7",
                      }}
                    >
                      <span className="text-[10px] font-semibold">{t.short}</span>
                      <span className="text-[9px]" style={{ color: active ? t.color : "#71717a" }}>
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {current && (
                <button
                  onClick={() => { unassign(m.badge); setPickerFor(null); }}
                  className="mt-2 w-full text-[10px] px-2 py-1.5 rounded font-semibold"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}
                >
                  Unassign current task
                </button>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Footer legend */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1 text-[9px]" style={{ color: "#71717a" }}>
        <span className="flex items-center gap-1"><Heart size={9} /> inner=HR</span>
        <span className="flex items-center gap-1"><Wind size={9} /> mid=air</span>
        <span className="flex items-center gap-1"><Radio size={9} /> outer=radio</span>
        <span>{count} on roster · {assignmentByBadge.size} assigned</span>
      </div>
    </div>
  );
}

function ConstellationSVG(_props: { all: CrewMember[]; activeBadges: string[]; tick: number }) {
  // Pulsing orbit rings — aesthetic background for the constellation.
  // Avoids SVG transform-origin quirks by using attribute animations.
  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }} viewBox="-200 -200 400 400" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="constellation-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(234,179,8,0.12)" />
          <stop offset="60%" stopColor="rgba(239,68,68,0.06)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <circle cx={0} cy={0} r={170} fill="url(#constellation-glow)" />
      <motion.circle
        cx={0} cy={0} r={120}
        fill="none"
        stroke="rgba(239,68,68,0.18)"
        strokeWidth={2}
        strokeDasharray="3 6"
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx={0} cy={0} r={80}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
        strokeDasharray="1 4"
        animate={{ opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />
      <circle cx={0} cy={0} r={40} fill="none" stroke="rgba(255,255,255,0.04)" />
    </svg>
  );
}

interface CrewAvatarProps {
  member: CrewMember;
  leader?: boolean;
  tick: number;
  activity: "staged" | "en_route" | "interior" | "exterior" | "rit";
  assigned?: { task: TaskKey; position: IcsPosition };
  parResponded?: boolean;
  parActive?: boolean;
  onClick?: () => void;
  onParAck?: () => void;
}

function CrewAvatar({ member, leader, tick, activity, assigned, parResponded, parActive, onClick, onParAck }: CrewAvatarProps) {
  const bio = synthesizeBiometric(member.badge, activity);
  const hrPulseMs = Math.round(60_000 / bio.heart_rate);
  const statusColor = STATUS_COLOR[bio.status];
  const airPct = Math.max(0, Math.min(100, (bio.air_psi / 4500) * 100));
  const task = assigned ? TASKS.find((t) => t.key === assigned.task) : null;
  const size = leader ? 76 : 56;

  const initials = member.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer: radio-hot glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -10,
          border: `1.5px solid ${bio.radio_hot ? "#3b82f6" : "rgba(255,255,255,0.08)"}`,
          boxShadow: bio.radio_hot ? "0 0 16px rgba(59,130,246,0.55)" : "none",
        }}
        animate={{ opacity: bio.radio_hot ? [0.4, 1, 0.4] : 0.3 }}
        transition={{ duration: bio.radio_hot ? 0.6 : 0.3, repeat: bio.radio_hot ? Infinity : 0 }}
      />

      {/* Middle: air remaining ring (circular progress) */}
      <svg className="absolute pointer-events-none" style={{ inset: -5, width: size + 10, height: size + 10 }} viewBox={`0 0 ${size + 10} ${size + 10}`}>
        <circle cx={(size + 10) / 2} cy={(size + 10) / 2} r={(size + 2) / 2} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={2} />
        <circle
          cx={(size + 10) / 2} cy={(size + 10) / 2} r={(size + 2) / 2}
          fill="none"
          stroke={airPct > 55 ? "#22c55e" : airPct > 30 ? "#eab308" : "#ef4444"}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={`${(airPct / 100) * Math.PI * (size + 2)} ${Math.PI * (size + 2)}`}
          transform={`rotate(-90 ${(size + 10) / 2} ${(size + 10) / 2})`}
          style={{ filter: airPct < 30 ? "drop-shadow(0 0 4px #ef4444)" : undefined, transition: "stroke-dasharray 400ms ease" }}
        />
      </svg>

      {/* Inner: HR heartbeat halo */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -2,
          border: `1.5px solid ${statusColor}`,
          boxShadow: `0 0 8px ${statusColor}50`,
        }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: hrPulseMs / 1000, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Avatar body */}
      <button
        onClick={onClick}
        className="absolute inset-0 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        style={{
          background: leader
            ? "linear-gradient(135deg, rgba(234,179,8,0.32), rgba(234,179,8,0.12))"
            : "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
          border: `1.5px solid ${leader ? "rgba(234,179,8,0.55)" : "rgba(255,255,255,0.12)"}`,
          backdropFilter: "blur(8px)",
          color: leader ? "#eab308" : "#e4e4e7",
          fontSize: leader ? 18 : 13,
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        {leader ? <Star size={size * 0.38} fill="#eab308" stroke="#eab308" /> : initials}
      </button>

      {/* Status dot */}
      <div className="absolute pointer-events-none" style={{ bottom: 2, right: 2 }}>
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}`, border: "1px solid #0a0a0e" }}
        />
      </div>

      {/* Task tag below avatar */}
      {task && (
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{
            bottom: -16,
            background: `${task.color}22`,
            color: task.color,
            border: `1px solid ${task.color}55`,
          }}
        >
          {task.short}
        </div>
      )}

      {/* Name plate for leader */}
      {leader && (
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold px-2 py-0.5 rounded"
          style={{
            top: -18,
            background: "rgba(234,179,8,0.15)",
            color: "#eab308",
            border: "1px solid rgba(234,179,8,0.35)",
          }}
        >
          CAPT {member.name.split(" ").slice(-1).join(" ")}
        </div>
      )}

      {/* PAR ack indicator — big, loud, unmissable when PAR is active */}
      {parActive && !leader && (
        <button
          onClick={(e) => { e.stopPropagation(); onParAck?.(); }}
          className={`absolute text-[10px] font-bold tracking-wider rounded-md transition-all ${parResponded ? "" : "animate-pulse"}`}
          style={{
            top: -22,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "3px 8px",
            background: parResponded ? "linear-gradient(135deg, #22c55e, #16a34a)" : "linear-gradient(135deg, #f97316, #ef4444)",
            color: "#fff",
            border: `1px solid ${parResponded ? "#22c55e" : "#ef4444"}`,
            boxShadow: parResponded
              ? "0 0 12px rgba(34,197,94,0.5)"
              : "0 0 14px rgba(239,68,68,0.55)",
            cursor: parResponded ? "default" : "pointer",
            whiteSpace: "nowrap",
          }}
          disabled={parResponded}
        >
          {parResponded ? "✓ PAR" : "ACK PAR"}
        </button>
      )}
    </div>
  );
}

function PARRing({ activePar }: { activePar: { initiated_at: string; responded: string[]; completed_at: string | null } }) {
  const [remaining, setRemaining] = useState(parDueIn(activePar.initiated_at));
  useEffect(() => {
    const id = setInterval(() => setRemaining(parDueIn(activePar.initiated_at)), 1000);
    return () => clearInterval(id);
  }, [activePar.initiated_at]);

  const total = 20 * 60 * 1000;
  const progress = remaining / total;
  const urgent = remaining < 120_000;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      {/* Responsive ring that sizes to its container via viewBox */}
      <svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: "95%", maxHeight: "95%" }}>
        <circle cx={200} cy={200} r={175} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={3} />
        <motion.circle
          cx={200} cy={200} r={175}
          fill="none"
          stroke={urgent ? "#ef4444" : "#eab308"}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${progress * 2 * Math.PI * 175} ${2 * Math.PI * 175}`}
          transform={`rotate(-90 200 200)`}
          style={{
            filter: urgent ? "drop-shadow(0 0 8px rgba(239,68,68,0.6))" : "drop-shadow(0 0 6px rgba(234,179,8,0.4))",
            transition: "stroke-dasharray 1s linear, stroke 0.3s ease",
          }}
          animate={{ opacity: urgent ? [0.6, 1, 0.6] : 0.9 }}
          transition={{ duration: urgent ? 0.8 : 0.3, repeat: urgent ? Infinity : 0 }}
        />
      </svg>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
        style={{
          background: urgent ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.12)",
          color: urgent ? "#ef4444" : "#eab308",
          border: `1px solid ${urgent ? "rgba(239,68,68,0.4)" : "rgba(234,179,8,0.3)"}`,
        }}
      >
        PAR · {Math.floor(remaining / 60_000)}:{String(Math.floor((remaining % 60_000) / 1000)).padStart(2, "0")}
      </div>
    </div>
  );
}
