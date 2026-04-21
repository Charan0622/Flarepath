"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Sparkles } from "lucide-react";

// Voice command overlay — long-press the mic orb to activate "Flarepath,
// mark hazard / exit / mayday / ack par". Uses Whisper in prod; demo uses
// simple keyword matching after a short listening state.
interface Intent {
  keyword: string[];
  label: string;
  action: string;
  accent: string;
}

const INTENTS: Intent[] = [
  { keyword: ["mark", "hazard"], label: "Mark hazard",  action: "mark_hazard",  accent: "#f97316" },
  { keyword: ["exit", "egress"], label: "Route to exit", action: "route_exit",   accent: "#22c55e" },
  { keyword: ["mayday"],         label: "Raise mayday",  action: "raise_mayday", accent: "#ef4444" },
  { keyword: ["ack", "par", "ok"], label: "Acknowledge PAR", action: "ack_par", accent: "#eab308" },
  { keyword: ["status", "scene"], label: "Status: On Scene", action: "status_on_scene", accent: "#3b82f6" },
];

interface Props {
  onIntent: (action: string) => void;
}

export default function VoiceCommandOverlay({ onIntent }: Props) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [matched, setMatched] = useState<Intent | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Long-press opens the listener
  function pressStart() {
    holdTimer.current = setTimeout(() => {
      setOpen(true);
      setListening(true);
      setTranscript("");
      setMatched(null);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
    }, 400);
  }
  function pressEnd() {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
  }

  // Demo "listening" — after a second, generate a fake transcript
  useEffect(() => {
    if (!listening) return;
    const demoTranscripts = ["Flarepath, mark hazard", "Flarepath, route to exit", "Flarepath, ack par ok"];
    const pick = demoTranscripts[Math.floor(Math.random() * demoTranscripts.length)];
    const id = setTimeout(() => {
      setTranscript(pick);
      const intent = INTENTS.find((i) => i.keyword.every((k) => pick.toLowerCase().includes(k)));
      setMatched(intent ?? null);
      setListening(false);
      setTimeout(() => {
        if (intent) onIntent(intent.action);
        setOpen(false);
      }, 1400);
    }, 1400);
    return () => clearTimeout(id);
  }, [listening, onIntent]);

  return (
    <>
      {/* Floating mic orb — top-right of viewport, purple */}
      <button
        onPointerDown={pressStart}
        onPointerUp={pressEnd}
        onPointerLeave={pressEnd}
        className="fixed z-[45] flex items-center justify-center rounded-full transition-transform active:scale-90"
        style={{
          top: 74, right: 12,
          width: 40, height: 40,
          background: "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(168,85,247,0.08))",
          border: "1px solid rgba(168,85,247,0.5)",
          color: "#c4b5fd",
          boxShadow: "0 0 12px rgba(168,85,247,0.3)",
        }}
        title="Long-press for voice command"
        aria-label="Voice command"
      >
        <Sparkles size={14} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <div className="absolute inset-0"
              style={{ background: "rgba(88,28,135,0.3)", backdropFilter: "blur(16px)" }} />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="relative text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={listening ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.9, repeat: listening ? Infinity : 0 }}
                className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{
                  background: matched
                    ? `linear-gradient(135deg, ${matched.accent}40, ${matched.accent}0a)`
                    : "linear-gradient(135deg, rgba(168,85,247,0.35), rgba(168,85,247,0.08))",
                  border: `2px solid ${matched ? matched.accent : "#a855f7"}`,
                  boxShadow: `0 0 40px ${matched ? `${matched.accent}80` : "rgba(168,85,247,0.6)"}`,
                }}
              >
                {matched ? (
                  <Sparkles size={48} style={{ color: matched.accent }} />
                ) : listening ? (
                  <Mic size={48} style={{ color: "#c4b5fd" }} />
                ) : (
                  <MicOff size={48} style={{ color: "#a1a1aa" }} />
                )}
              </motion.div>

              <div className="text-[20px] font-bold tracking-[0.08em] text-white mb-2">
                {matched ? matched.label : listening ? "Listening…" : "Voice idle"}
              </div>
              <div className="text-[11px]" style={{ color: matched ? matched.accent : "#c4b5fd" }}>
                {matched
                  ? "Executing intent"
                  : listening
                    ? transcript || "Say \"Flarepath, mark hazard\""
                    : "Tap to dismiss"}
              </div>

              {!listening && !matched && (
                <div className="mt-6 grid grid-cols-2 gap-1.5 max-w-xs mx-auto">
                  {INTENTS.map((i) => (
                    <div key={i.action} className="text-[9px] px-2 py-1 rounded text-left"
                      style={{ background: `${i.accent}18`, color: i.accent, border: `1px solid ${i.accent}40` }}>
                      &ldquo;{i.keyword.join(" ")}&rdquo;
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
