"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Radio, Check, CheckCheck, Volume2 } from "lucide-react";
import { useChief } from "@/lib/chief-store";
import { composeOrder } from "@/lib/chief-data";

interface Props {
  incidentType: string;
  incidentAddress: string;
  severity: string;
  etaSeconds: number;
  dispatcherId?: string;
}

// The centerpiece connection element: streams an order from dispatcher to chief
// with token-by-token reveal + voice waveform + authenticated handshake.
export default function DispatcherTether({
  incidentType, incidentAddress, severity, etaSeconds, dispatcherId = "DSP-07",
}: Props) {
  const { state, ackOrder } = useChief();
  const orderText = composeOrder(incidentType, incidentAddress, severity, etaSeconds);
  const [revealedChars, setRevealedChars] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(24).fill(0.2));

  // Token-by-token reveal (LLM-style)
  useEffect(() => {
    if (revealedChars >= orderText.length) return;
    const id = setTimeout(() => setRevealedChars((c) => Math.min(orderText.length, c + Math.floor(1 + Math.random() * 3))), 28);
    return () => clearTimeout(id);
  }, [revealedChars, orderText.length]);

  // Waveform animation while streaming or when dispatch "transmits"
  useEffect(() => {
    const streaming = revealedChars < orderText.length;
    if (!streaming && state.orderAcknowledged) {
      setWaveformBars((prev) => prev.map(() => 0.12));
      return;
    }
    const id = setInterval(() => {
      setWaveformBars(() => {
        const bars = Array(24).fill(0).map(() => 0.15 + Math.random() * (streaming ? 0.85 : 0.3));
        return bars;
      });
    }, 90);
    return () => clearInterval(id);
  }, [revealedChars, orderText.length, state.orderAcknowledged]);

  const streaming = revealedChars < orderText.length;
  const shown = orderText.slice(0, revealedChars);
  const dispatcherHash = dispatcherId.slice(-4).toLowerCase();

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(59,130,246,0.05))",
        border: `1px solid ${state.orderAcknowledged ? "rgba(34,197,94,0.3)" : streaming ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.2)"}`,
        boxShadow: streaming
          ? "0 0 24px rgba(239,68,68,0.25), inset 0 1px 0 rgba(255,255,255,0.05)"
          : state.orderAcknowledged
            ? "0 0 16px rgba(34,197,94,0.15)"
            : "0 2px 12px rgba(0,0,0,0.3)",
      }}
    >
      {/* Animated tether line — SVG polyline with marching dashes from dispatch node to chief */}
      <svg className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: 40, width: "100%" }} viewBox="0 0 800 40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="tether-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <motion.path
          d="M 40 20 Q 400 30, 760 20"
          fill="none"
          stroke="url(#tether-gradient)"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          strokeDashoffset={0}
          animate={{ strokeDashoffset: streaming ? -200 : 0 }}
          transition={{ duration: streaming ? 1.2 : 0.3, repeat: streaming ? Infinity : 0, ease: "linear" }}
          opacity={state.orderAcknowledged ? 0.3 : streaming ? 0.9 : 0.55}
        />
      </svg>

      <div className="relative p-4">
        {/* Header row — dispatcher badge + live indicator + chief badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)" }}
            >
              <Radio size={14} style={{ color: "#60a5fa" }} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "#71717a" }}>Dispatch</span>
              <span className="text-[12px] font-mono font-semibold text-white">{dispatcherId}<span className="opacity-50">·{dispatcherHash}</span></span>
            </div>
          </div>

          {/* Live link status */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider`}
              style={{
                background: streaming ? "rgba(239,68,68,0.15)" : state.orderAcknowledged ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                color: streaming ? "#ef4444" : state.orderAcknowledged ? "#22c55e" : "#a1a1aa",
              }}
            >
              <span className="relative w-1.5 h-1.5">
                <span className={`absolute inset-0 rounded-full ${streaming || !state.orderAcknowledged ? "animate-ping" : ""}`} style={{ background: streaming ? "#ef4444" : state.orderAcknowledged ? "#22c55e" : "#a1a1aa" }} />
                <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: streaming ? "#ef4444" : state.orderAcknowledged ? "#22c55e" : "#a1a1aa" }} />
              </span>
              {streaming ? "Transmitting" : state.orderAcknowledged ? "Acknowledged" : "Link live"}
            </div>
          </div>
        </div>

        {/* Waveform */}
        <div className="flex items-end gap-[2px] h-8 mb-3 px-1">
          {waveformBars.map((amp, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-full"
              animate={{ scaleY: amp }}
              transition={{ duration: 0.1 }}
              style={{
                transformOrigin: "center",
                height: "100%",
                background: streaming ? "#ef4444" : state.orderAcknowledged ? "#22c55e" : "#a1a1aa",
                opacity: streaming ? 0.85 : state.orderAcknowledged ? 0.45 : 0.35,
              }}
            />
          ))}
        </div>

        {/* Streaming order text with blinking caret */}
        <div
          className="p-3 rounded-lg font-mono text-[11px] leading-relaxed"
          style={{
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.04)",
            color: "#e4e4e7",
            minHeight: 72,
          }}
        >
          <span>{shown}</span>
          {streaming && <span className="inline-block w-[7px] h-[12px] ml-0.5 animate-pulse" style={{ background: "#ef4444", verticalAlign: "middle" }} />}
        </div>

        {/* Acknowledgement handshake */}
        <div className="flex items-center justify-between mt-3 gap-3">
          <div className="flex items-center gap-2 text-[10px]" style={{ color: "#71717a" }}>
            <Volume2 size={10} />
            <span>Read back on <span className="font-mono text-[#a1a1aa]">TAC-1</span> · CRM two-tap ack</span>
          </div>
          {!streaming && !state.orderAcknowledged ? (
            <motion.button
              onClick={ackOrder}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                boxShadow: "0 0 16px rgba(34,197,94,0.4)",
              }}
            >
              <Check size={12} />
              Received — Executing
            </motion.button>
          ) : state.orderAcknowledged ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold"
              style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
              <CheckCheck size={11} />
              Ack at {state.orderAckAt ? new Date(state.orderAckAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: false }) : "—"}
            </div>
          ) : (
            <div className="text-[10px]" style={{ color: "#71717a" }}>streaming…</div>
          )}
        </div>
      </div>
    </div>
  );
}
