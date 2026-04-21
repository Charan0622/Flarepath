"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, X } from "lucide-react";
import { useMember } from "@/lib/member-store";
import type { CrewMember } from "@/lib/crew-data";

interface Props {
  open: boolean;
  onClose: () => void;
  members: CrewMember[];
  selfBadge: string | null;
}

export default function BuddyPicker({ open, onClose, members, selfBadge }: Props) {
  const { state, setBuddy } = useMember();
  const pickable = members.filter((m) => m.badge !== selfBadge);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[50] flex items-end"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0" style={{ background: "rgba(4,4,8,0.65)", backdropFilter: "blur(8px)" }}
            onClick={onClose} />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="glass-strong relative w-full rounded-t-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 rounded-full mx-auto mb-3" style={{ background: "rgba(255,255,255,0.12)" }} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={14} style={{ color: "#22c55e" }} />
                <span className="text-[13px] font-bold text-white">Select Buddy (2-in/2-out)</span>
              </div>
              <button onClick={onClose} className="p-1 rounded hover:bg-white/[0.05]">
                <X size={14} style={{ color: "#a1a1aa" }} />
              </button>
            </div>
            <div className="space-y-1.5 max-h-[50vh] overflow-auto">
              {pickable.map((m) => {
                const isSel = state.buddyBadge === m.badge;
                return (
                  <button
                    key={m.badge}
                    onClick={() => { setBuddy(m.badge); onClose(); }}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left"
                    style={{
                      background: isSel ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isSel ? "rgba(34,197,94,0.45)" : "rgba(255,255,255,0.06)"}`,
                      minHeight: 52,
                    }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                      {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-white truncate">{m.name}</div>
                      <div className="text-[10px]" style={{ color: "#a1a1aa" }}>{m.rank} · {m.badge}</div>
                    </div>
                    {isSel && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e" }}>SELECTED</span>}
                  </button>
                );
              })}
              {state.buddyBadge && (
                <button
                  onClick={() => { setBuddy(null); onClose(); }}
                  className="w-full text-[11px] px-3 py-2 rounded font-semibold mt-2"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}
                >
                  Clear buddy
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
