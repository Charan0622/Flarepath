"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Star, X, Users } from "lucide-react";
import type { CrewMember } from "@/lib/crew-data";

interface Props {
  captain: CrewMember | null;
  members: CrewMember[];
  memberBadge: string | null;
}

// Tiny orbital-stub preview in the top-left of the HUD showing the chief's
// constellation as the firefighter sees it. Tap to open a read-only sheet.
export default function OrbitalStub({ captain, members, memberBadge }: Props) {
  const [open, setOpen] = useState(false);
  const all = [captain, ...members].filter(Boolean) as CrewMember[];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 transition-transform active:scale-95"
        style={{
          background: "rgba(8,8,14,0.85)",
          border: "1px solid rgba(234,179,8,0.4)",
          boxShadow: "0 0 10px rgba(234,179,8,0.18)",
        }}
      >
        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(234,179,8,0.25)", border: "1px solid rgba(234,179,8,0.5)" }}>
          <Star size={11} fill="#eab308" stroke="#eab308" />
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: "#eab308" }}>
          Capt. link
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0" style={{ background: "rgba(4,4,8,0.6)", backdropFilter: "blur(10px)" }}
              onClick={() => setOpen(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="glass-strong relative w-full rounded-t-2xl p-5 max-h-[70vh] overflow-auto"
              style={{ boxShadow: "0 -12px 40px rgba(0,0,0,0.55)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 rounded-full mx-auto mb-3" style={{ background: "rgba(255,255,255,0.12)" }} />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users size={14} style={{ color: "#eab308" }} />
                  <span className="text-[13px] font-bold text-white">Chief&apos;s Constellation</span>
                </div>
                <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/[0.05]">
                  <X size={14} style={{ color: "#a1a1aa" }} />
                </button>
              </div>
              <p className="text-[11px] mb-4" style={{ color: "#71717a" }}>
                This is what the chief sees on their constellation — updated live. You are highlighted.
              </p>
              <div className="space-y-2">
                {all.map((m) => {
                  const isMe = m.badge === memberBadge;
                  const isCap = captain?.badge === m.badge;
                  return (
                    <div key={m.badge} className="flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{
                        background: isMe ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${isMe ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: isCap ? "rgba(234,179,8,0.25)" : "rgba(255,255,255,0.06)",
                          border: `1px solid ${isCap ? "rgba(234,179,8,0.5)" : "rgba(255,255,255,0.1)"}`,
                          fontSize: 10, fontWeight: 700,
                          color: isCap ? "#eab308" : "#fff",
                        }}
                      >
                        {isCap ? <Star size={11} fill="#eab308" stroke="#eab308" /> : m.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-white truncate">
                          {m.name} {isMe && <span className="text-[9px] ml-1 px-1 rounded" style={{ background: "rgba(59,130,246,0.2)", color: "#60a5fa" }}>YOU</span>}
                        </div>
                        <div className="text-[9px]" style={{ color: "#a1a1aa" }}>{m.rank} · {m.badge}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
