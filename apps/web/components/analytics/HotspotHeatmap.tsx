"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Flame } from "lucide-react";
import AnalyticsCard, { MetaChip } from "./AnalyticsCard";
import MapResetButton from "@/components/MapResetButton";

const DEFAULT_VIEW = { center: [-121.8863, 37.3382] as [number, number], zoom: 11, pitch: 0, bearing: 0 };

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface Hotspot {
  lng: number;
  lat: number;
  severity: string;
  type: string;
  created_at: string;
}

type Window = "7" | "30" | "365";
const WINDOW_LABELS: Record<Window, string> = { "7": "7 days", "30": "30 days", "365": "1 year" };

export default function HotspotHeatmap({ hotspots, span = 8 }: { hotspots: Hotspot[]; span?: number }) {
  const cRef = useRef<HTMLDivElement>(null);
  const mRef = useRef<mapboxgl.Map | null>(null);
  const [ok, setOk] = useState(false);
  const [win, setWin] = useState<Window>("30");

  const now = Date.now();
  const cutoff = now - Number(win) * 86400000;
  const filtered = hotspots.filter((h) => new Date(h.created_at).getTime() >= cutoff);

  // Init map once — defer to next frame so the grid cell has dimensions
  useEffect(() => {
    if (!cRef.current || mRef.current) return;
    if (!mapboxgl.accessToken) {
      console.error("[HotspotHeatmap] NEXT_PUBLIC_MAPBOX_TOKEN missing");
      return;
    }
    const raf = requestAnimationFrame(() => {
      if (!cRef.current || mRef.current) return;
      const m = new mapboxgl.Map({
        container: cRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        ...DEFAULT_VIEW,
        interactive: true,
      });
      m.on("error", (e) => console.error("[HotspotHeatmap]", e?.error?.message || e));
      m.on("load", () => {
        m.resize();
        setOk(true);
      });
      mRef.current = m;
      if (cRef.current) {
        const ro = new ResizeObserver(() => m.resize());
        ro.observe(cRef.current);
        (m as unknown as { _ro?: ResizeObserver })._ro = ro;
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      const m = mRef.current as unknown as (mapboxgl.Map & { _ro?: ResizeObserver }) | null;
      m?._ro?.disconnect();
      m?.remove();
      mRef.current = null;
    };
  }, []);

  // Update heatmap source on filter change
  useEffect(() => {
    if (!ok || !mRef.current) return;
    const m = mRef.current;
    const geojson = {
      type: "FeatureCollection" as const,
      features: filtered.map((h) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [h.lng, h.lat] },
        properties: {
          weight: h.severity === "critical" ? 1 : h.severity === "high" ? 0.75 : h.severity === "medium" ? 0.5 : 0.25,
        },
      })),
    };
    const srcId = "hotspot-src";
    if (m.getSource(srcId)) {
      (m.getSource(srcId) as mapboxgl.GeoJSONSource).setData(geojson);
    } else {
      m.addSource(srcId, { type: "geojson", data: geojson });
      m.addLayer({
        id: "hotspot-heat",
        type: "heatmap",
        source: srcId,
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1, 15, 3],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "rgba(234,179,8,0.4)",
            0.4, "rgba(249,115,22,0.6)",
            0.7, "rgba(239,68,68,0.8)",
            1, "rgba(239,68,68,1)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 18, 15, 40],
          "heatmap-opacity": 0.85,
        },
      });
      m.addLayer({
        id: "hotspot-points",
        type: "circle",
        source: srcId,
        minzoom: 13,
        paint: {
          "circle-radius": 4,
          "circle-color": "#ef4444",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1,
          "circle-opacity": 0.9,
        },
      });
    }
  }, [ok, filtered]);

  return (
    <AnalyticsCard
      title="Incident Hotspot Heatmap"
      subtitle="Density-weighted map of where incidents cluster"
      icon={Flame}
      accent="#ef4444"
      span={span}
      trailing={
        <div className="flex items-center gap-2">
          <MetaChip accent={filtered.length > 0 ? "#ef4444" : "#71717a"}>
            {filtered.length} pts
          </MetaChip>
          <div className="flex items-center gap-1 rounded-md p-0.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            {(Object.keys(WINDOW_LABELS) as Window[]).map((w) => (
              <button
                key={w}
                onClick={() => setWin(w)}
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded transition-colors"
                style={{
                  background: win === w ? "rgba(239,68,68,0.18)" : "transparent",
                  color: win === w ? "#ef4444" : "#a1a1aa",
                }}
              >
                {WINDOW_LABELS[w]}
              </button>
            ))}
          </div>
        </div>
      }
      footer={<span>{filtered.length} incidents in window · gradient: yellow → orange → red by density</span>}
    >
      <div className="relative rounded-md overflow-hidden" style={{ height: 260, minHeight: 260, border: "1px solid rgba(255,255,255,0.05)" }}>
        <div ref={cRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        <MapResetButton onReset={() => mRef.current?.flyTo({ ...DEFAULT_VIEW, duration: 700 })} />
        {filtered.length === 0 && ok && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center px-4 py-2 rounded-md glass text-[11px]" style={{ color: "#a1a1aa" }}>
              No incidents in the last {WINDOW_LABELS[win]}
            </div>
          </div>
        )}
      </div>
    </AnalyticsCard>
  );
}
