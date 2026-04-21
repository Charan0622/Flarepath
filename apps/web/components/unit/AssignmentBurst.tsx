"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Megaphone, Clock, Star } from "lucide-react";
import { TASKS, POSITIONS } from "@/lib/chief-data";
import { useMember } from "@/lib/member-store";

interface Props {
  latest: {
    id: string;
    task: string;
    position: string;
    assigned_at: string;
  } | null;
  captainName: string;
  captainBadge: string;
  memberName: string;
}

// The singular most important UI element: when the chief pushes you a
// task, this card bursts onto the screen — radial burst from captain's
// avatar, streaming order text, two-step ACK button, haptic.
export default function AssignmentBurst({ latest, captainName, captainBadge: _captainBadge, memberName }: Props) {
  const { state, ackOrder } = useMember();
  const [elapsed, setElapsed] = useState(0);

  const acked = latest ? state.acknowledgedOrderIds.includes(latest.id) : false;
  const taskMeta = latest ? TASKS.find((t) => t.key === latest.task) : null;
  const posMeta = latest ? POSITIONS.find((p) => p.key === latest.position) : null;

  // Tick the elapsed clock once every second
  useEffect(() => {
    if (!latest) return;
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(latest.assigned_at).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [latest]);

  // Haptic + vibration when a NEW assignment arrives
  useEffect(() => {
    if (!latest || acked) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }, [latest?.id]);

  // Streaming text reveal for the order sentence
  const orderText = useMemo(() => {
    if (!latest || !taskMeta) return "";
    return `CAPT ${captainName.split(" ").slice(-1)[0]} assigning ${taskMeta.label.toLowerCase()} (${posMeta?.short ?? latest.position.toUpperCase()}). Acknowledge and execute.`;
  }, [latest, taskMeta, posMeta, captainName]);

  const [revealedChars, setRevealedChars] = useState(0);
  useEffect(() => {
    if (!latest || acked) return;
    setRevealedChars(0);
  }, [latest?.id, acked]);

  useEffect(() => {
    if (!latest || acked) return;
    if (revealedChars >= orderText.length) return;
    const id = setTimeout(() => setRevealedChars((c) => Math.min(orderText.length, c + 2)), 24);
    return () => clearTimeout(id);
  }, [latest, orderText.length, revealedChars, acked]);

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const elapsedColor = elapsed > 20 * 60 ? "#ef4444" : elapsed > 15 * 60 ? "#eab308" : "#a1a1aa";
  const streaming = revealedChars < orderText.length;

  if (!latest || !taskMeta) {
    return (
      <div
        className="rounded-2xl p-4 mx-3"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Megaphone size={12} style={{ color: "#71717a" }} />
          <span className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "#71717a" }}>Standing By</span>
        </div>
        <p className="text-[13px]" style={{ color: "#a1a1aa" }}>
          No assignment yet. Command will push your task when ready.
        </p>
      </div>
    );
  }

  return (
    <div className="relative mx-3">
      {/* Radial burst when the order just arrived */}
      <AnimatePresence>
        {!acked && (
          <motion.div
            key={latest.id}
            className="absolute inset-0 rounded-2xl pointer-events-none"
            initial={{ opacity: 0.8, scale: 0.9 }}
            animate={{ opacity: 0, scale: 1.25 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              background: `radial-gradient(circle at 18px 18px, ${taskMeta.color}80, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        initial={{ scale: 0.95, opacity: 0, y: -8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="rounded-2xl p-4"
        style={{
          background: acked
            ? "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.02))"
            : `linear-gradient(135deg, ${taskMeta.color}1e, ${taskMeta.color}05)`,
          border: `1.5px solid ${acked ? "rgba(34,197,94,0.4)" : `${taskMeta.color}55`}`,
          boxShadow: acked
            ? "0 0 18px rgba(34,197,94,0.2)"
            : `0 0 24px ${taskMeta.color}3a, inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
      >
        {/* Captain avatar → arrow → member avatar — the Assignment Ray motif */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(234,179,8,0.32), rgba(234,179,8,0.08))",
              border: "1.5px solid rgba(234,179,8,0.5)",
              boxShadow: "0 0 12px rgba(234,179,8,0.35)",
            }}
          >
            <Star size={14} fill="#eab308" stroke="#eab308" />
          </div>

          <motion.div
            className="relative h-[2px] flex-1 rounded-full"
            style={{ background: `linear-gradient(90deg, #eab308, ${taskMeta.color})` }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <motion.div
              className="absolute top-1/2 w-1.5 h-1.5 rounded-full -translate-y-1/2"
              style={{ background: "#fff", boxShadow: `0 0 8px ${taskMeta.color}` }}
              animate={{ left: ["0%", "100%"] }}
              transition={{ duration: 1.1, repeat: acked ? 0 : Infinity, ease: "easeInOut" }}
            />
            <ArrowRight
              size={12}
              style={{
                color: taskMeta.color,
                position: "absolute",
                right: -6,
                top: -5,
                filter: `drop-shadow(0 0 4px ${taskMeta.color})`,
              }}
            />
          </motion.div>

          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${taskMeta.color}40, ${taskMeta.color}10)`,
              border: `1.5px solid ${taskMeta.color}80`,
              boxShadow: `0 0 10px ${taskMeta.color}50`,
              color: "#fff",
              fontSize: 11, fontWeight: 800, letterSpacing: "0.04em",
            }}
          >
            {memberName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
          </div>
        </div>

        {/* Task headline */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded"
              style={{ background: `${taskMeta.color}2a`, color: taskMeta.color, border: `1px solid ${taskMeta.color}55` }}>
              {posMeta?.short ?? latest.position}
            </span>
            <span className="text-[10px]" style={{ color: "#71717a" }}>ordered by Capt. {captainName.split(" ").slice(-1)[0]}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] tabular-nums" style={{ color: elapsedColor }}>
            <Clock size={10} />
            <span className="font-mono">{elapsedMin}:{String(elapsedSec).padStart(2, "0")}</span>
          </div>
        </div>
        <div className="text-[22px] font-bold text-white tracking-tight leading-tight">
          {taskMeta.label}
        </div>

        {/* Streaming order sentence (voice scroll) */}
        <div
          className="mt-3 p-2.5 rounded-lg font-mono text-[11px] leading-relaxed"
          style={{
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.04)",
            color: "#d4d4d8",
            minHeight: 48,
          }}
        >
          <span>{orderText.slice(0, revealedChars)}</span>
          {streaming && <span className="inline-block w-[6px] h-[10px] ml-0.5 animate-pulse" style={{ background: taskMeta.color, verticalAlign: "middle" }} />}
        </div>

        {/* ACK button — 56px+ thumb-friendly */}
        {!acked ? (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => ackOrder(latest.id)}
            className="w-full mt-3 rounded-xl flex items-center justify-center gap-2 text-[14px] font-bold tracking-wider text-white"
            style={{
              minHeight: 56,
              background: "linear-gradient(180deg, #22c55e, #16a34a)",
              boxShadow: "0 0 24px rgba(34,197,94,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
              letterSpacing: "0.16em",
            }}
          >
            <Check size={18} strokeWidth={3} />
            ACKNOWLEDGE
          </motion.button>
        ) : (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold"
            style={{ color: "#22c55e" }}>
            <Check size={14} />
            Acknowledged at {state.trail.filter((t) => t.kind === "order_ack" && t.payload?.id === latest.id)[0]
              ? new Date(state.trail.filter((t) => t.kind === "order_ack" && t.payload?.id === latest.id)[0].ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
              : "—"} · executing
          </div>
        )}
      </motion.div>
    </div>
  );
}
