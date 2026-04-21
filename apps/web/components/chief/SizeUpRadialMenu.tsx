"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SIDE_STATE_META, type BuildingSide, type SideState } from "@/lib/chief-data";

// Actions a chief can mark for each side.
const SIDE_ACTIONS: { key: Exclude<SideState, "unknown">; label: string; short: string }[] = [
  { key: "clear",  label: "Clear",          short: "Clear"  },
  { key: "smoke",  label: "Smoke showing",  short: "Smoke"  },
  { key: "fire",   label: "Fire showing",   short: "Fire"   },
  { key: "victim", label: "Victim reported", short: "Victim" },
];

interface Props {
  sides: BuildingSide[];
  sizeUp: Record<BuildingSide, SideState>;
  onSet: (side: BuildingSide, state: SideState) => void;
  crewCounts?: Record<BuildingSide, number>;
}

// 4 clickable building-side anchors on the canvas, each expanding into a
// radial popover with 4 action bubbles (Clear / Smoke / Fire / Victim).
export default function SizeUpRadialMenu({ sides, sizeUp, onSet, crewCounts }: Props) {
  const [openSide, setOpenSide] = useState<BuildingSide | null>(null);

  // ESC closes
  useEffect(() => {
    if (!openSide) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenSide(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSide]);

  // Click outside closes
  useEffect(() => {
    if (!openSide) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-sizeup-anchor]") && !target.closest("[data-sizeup-popover]")) {
        setOpenSide(null);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [openSide]);

  const positions: Record<BuildingSide, { top: string; left: string }> = {
    A: { top: "22%", left: "50%" },
    B: { top: "50%", left: "78%" },
    C: { top: "78%", left: "50%" },
    D: { top: "50%", left: "22%" },
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {sides.map((side) => {
        const pos = positions[side];
        const state = sizeUp[side];
        const meta = SIDE_STATE_META[state];
        const isOpen = openSide === side;

        return (
          <div
            key={side}
            className="absolute pointer-events-auto"
            style={{ top: pos.top, left: pos.left, transform: "translate(-50%, -50%)" }}
          >
            {/* Anchor letter */}
            <button
              data-sizeup-anchor
              onClick={(e) => { e.stopPropagation(); setOpenSide(isOpen ? null : side); }}
              title={`Side ${side}: ${meta.label}`}
              className="relative flex flex-col items-center gap-1 transition-transform hover:scale-105"
            >
              <div
                className="relative w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold backdrop-blur"
                style={{
                  background: `${meta.color}2e`,
                  border: `2px solid ${meta.color}`,
                  color: "#fff",
                  boxShadow: state !== "unknown"
                    ? `0 0 14px ${meta.color}80, inset 0 1px 0 rgba(255,255,255,0.15)`
                    : "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                {side}
                {isOpen && (
                  <motion.div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    initial={{ scale: 1, opacity: 0.7 }}
                    animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{ border: `2px solid ${meta.color}` }}
                  />
                )}
              </div>

              {/* State label + crew count pill under the letter */}
              <div className="flex items-center gap-1">
                <div
                  className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{ background: "rgba(8,8,14,0.9)", color: meta.color, border: `1px solid ${meta.color}40` }}
                >
                  {meta.label}
                </div>
                {crewCounts && crewCounts[side] > 0 && (
                  <div
                    className="px-1.5 py-0.5 rounded text-[8px] font-bold tabular-nums whitespace-nowrap"
                    style={{ background: "rgba(234,179,8,0.18)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}
                    title={`${crewCounts[side]} crew assigned to Side ${side}`}
                  >
                    👥 {crewCounts[side]}
                  </div>
                )}
              </div>
            </button>

            {/* Radial pop-out bubbles */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  data-sizeup-popover
                  className="absolute pointer-events-auto"
                  style={{
                    top: "50%",
                    left: "50%",
                    width: 0, height: 0,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {SIDE_ACTIONS.map((action, idx) => {
                    // Arrange bubbles in a 180° arc facing outward from the letter center
                    const outward = outwardAngle(side); // radians
                    const arc = Math.PI * 0.9; // arc width
                    const angle = outward - arc / 2 + (idx / (SIDE_ACTIONS.length - 1)) * arc;
                    const radius = 56;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    const actionMeta = SIDE_STATE_META[action.key];
                    const isCurrent = state === action.key;

                    return (
                      <motion.button
                        key={action.key}
                        onClick={() => { onSet(side, action.key); setOpenSide(null); }}
                        initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: 1, x, y, scale: 1 }}
                        exit={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20, delay: idx * 0.04 }}
                        className="absolute flex items-center justify-center text-[9px] font-bold uppercase tracking-wider transition-transform hover:scale-110"
                        style={{
                          left: 0, top: 0,
                          padding: "4px 8px",
                          borderRadius: 8,
                          background: isCurrent
                            ? `${actionMeta.color}40`
                            : `rgba(8,8,14,0.92)`,
                          color: isCurrent ? "#fff" : actionMeta.color,
                          border: `1.5px solid ${actionMeta.color}`,
                          boxShadow: `0 4px 14px ${actionMeta.color}55`,
                          transform: "translate(-50%, -50%)",
                          whiteSpace: "nowrap",
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        {action.short}
                        {isCurrent && <span className="ml-1 opacity-90">●</span>}
                      </motion.button>
                    );
                  })}

                  {/* Clear (reset to unknown) option in the center */}
                  {state !== "unknown" && (
                    <motion.button
                      onClick={() => { onSet(side, "unknown"); setOpenSide(null); }}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ delay: 0.2 }}
                      className="absolute text-[8px] uppercase tracking-wider"
                      style={{
                        left: 0, top: 0,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "rgba(8,8,14,0.9)",
                        color: "#71717a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        transform: `translate(-50%, calc(-50% + ${outwardY(side) * 38}px))`,
                      }}
                    >
                      reset
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// For each side, the angle (radians) pointing AWAY from the building center
// toward the outside of the canvas, so the bubbles pop outward.
function outwardAngle(side: BuildingSide): number {
  switch (side) {
    case "A": return -Math.PI / 2;    // up
    case "B": return 0;                // right
    case "C": return Math.PI / 2;      // down
    case "D": return Math.PI;          // left
  }
}
function outwardY(side: BuildingSide): number {
  // Direction to place the "reset" pill relative to the anchor
  switch (side) {
    case "A": return 1;
    case "B": return 0;
    case "C": return -1;
    case "D": return 0;
  }
}
