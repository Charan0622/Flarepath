"use client";

import { useMemo } from "react";
import { Navigation, MapPin, ChevronRight, Clock } from "lucide-react";

interface Props {
  routeGeoJSON: GeoJSON.LineString | null;
  etaSeconds: number | null;
  distanceM: number | null;
  onScene: boolean;
  address: string;
}

// Turn-by-turn "next maneuver" tile for en-route mode. Shrinks to a small
// arrival chip when the firefighter is on-scene (< 50m from incident).
export default function TurnByTurnTile({ routeGeoJSON, etaSeconds, distanceM, onScene, address }: Props) {
  const nextManeuver = useMemo(() => {
    if (!routeGeoJSON || routeGeoJSON.coordinates.length < 3) return null;
    // Heuristic: sample the first big heading change along the route
    const coords = routeGeoJSON.coordinates as [number, number][];
    for (let i = 1; i < Math.min(coords.length - 1, 6); i++) {
      const [ax, ay] = coords[i - 1];
      const [bx, by] = coords[i];
      const [cx, cy] = coords[i + 1];
      const cross = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
      if (Math.abs(cross) > 1e-8) {
        return cross > 0 ? "Left" : "Right";
      }
    }
    return "Straight";
  }, [routeGeoJSON]);

  if (onScene) {
    return (
      <div
        className="mx-3 rounded-xl flex items-center gap-2 px-3 py-2.5"
        style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.04))",
          border: "1px solid rgba(34,197,94,0.4)",
        }}
      >
        <MapPin size={14} style={{ color: "#22c55e" }} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "#22c55e" }}>On Scene</div>
          <div className="text-[11px] truncate" style={{ color: "#d4d4d8" }}>{address.split(",")[0]}</div>
        </div>
      </div>
    );
  }

  const etaMin = etaSeconds ? Math.ceil(etaSeconds / 60) : null;
  const distKm = distanceM ? (distanceM / 1000).toFixed(1) : null;

  return (
    <div
      className="mx-3 rounded-xl flex items-center gap-3 p-3"
      style={{
        background: "linear-gradient(135deg, rgba(59,130,246,0.14), rgba(59,130,246,0.03))",
        border: "1px solid rgba(59,130,246,0.35)",
        boxShadow: "0 0 14px rgba(59,130,246,0.15)",
      }}
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.35), rgba(59,130,246,0.1))",
          border: "1.5px solid rgba(59,130,246,0.5)",
          boxShadow: "0 0 12px rgba(59,130,246,0.35)",
        }}
      >
        {nextManeuver === "Left" ? (
          <ChevronRight size={26} style={{ color: "#60a5fa", transform: "scaleX(-1)" }} />
        ) : nextManeuver === "Right" ? (
          <ChevronRight size={26} style={{ color: "#60a5fa" }} />
        ) : (
          <Navigation size={22} style={{ color: "#60a5fa" }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#60a5fa" }}>
          Next: {nextManeuver ?? "Continue"}
        </div>
        <div className="text-[13px] font-semibold text-white truncate">{address.split(",")[0]}</div>
        <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: "#a1a1aa" }}>
          {etaMin !== null && (
            <span className="flex items-center gap-1 font-mono tabular-nums">
              <Clock size={10} />{etaMin} min
            </span>
          )}
          {distKm !== null && <span className="font-mono tabular-nums">{distKm} km</span>}
        </div>
      </div>
    </div>
  );
}
