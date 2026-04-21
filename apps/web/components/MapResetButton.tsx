"use client";

import { Home } from "lucide-react";

interface Props {
  onReset: () => void;
  title?: string;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

// Small glass home button that sits over a Mapbox canvas and restores the
// camera to its original view.
export default function MapResetButton({
  onReset,
  title = "Reset view",
  position = "top-right",
}: Props) {
  const pos: Record<NonNullable<Props["position"]>, string> = {
    "top-right": "top-2 right-2",
    "top-left": "top-2 left-2",
    "bottom-right": "bottom-2 right-2",
    "bottom-left": "bottom-2 left-2",
  };
  return (
    <button
      type="button"
      onClick={onReset}
      title={title}
      aria-label={title}
      className={`absolute ${pos[position]} z-10 w-7 h-7 rounded-md flex items-center justify-center glass-strong transition-all hover:bg-white/[0.08] hover:scale-[1.06] active:scale-[0.94]`}
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#e4e4e7",
        boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
      }}
    >
      <Home size={12} />
    </button>
  );
}
