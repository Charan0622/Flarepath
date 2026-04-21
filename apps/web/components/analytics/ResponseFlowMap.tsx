"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Navigation } from "lucide-react";
import AnalyticsCard, { MetaChip } from "./AnalyticsCard";
import MapResetButton from "@/components/MapResetButton";

const DEFAULT_VIEW = { center: [-121.8863, 37.3500] as [number, number], zoom: 10.8, pitch: 0, bearing: 0 };

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface Flow {
  from: [number, number];
  to: [number, number];
  severity: string;
  count: number;
}

const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};

// Arc generator: quadratic bezier with a height offset perpendicular to the chord
function arcPath(a: [number, number], b: [number, number], curvature = 0.15, steps = 40): [number, number][] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const nx = -dy;
  const ny = dx;
  const cx = mx + nx * curvature;
  const cy = my + ny * curvature;
  const out: [number, number][] = [];
  for (let t = 0; t <= 1.0001; t += 1 / steps) {
    const x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * cx + t ** 2 * b[0];
    const y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * cy + t ** 2 * b[1];
    out.push([x, y]);
  }
  return out;
}

export default function ResponseFlowMap({ flows, span = 8 }: { flows: Flow[]; span?: number }) {
  const cRef = useRef<HTMLDivElement>(null);
  const mRef = useRef<mapboxgl.Map | null>(null);
  const dashRef = useRef<number>(0);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!cRef.current || mRef.current) return;
    if (!mapboxgl.accessToken) {
      console.error("[ResponseFlowMap] NEXT_PUBLIC_MAPBOX_TOKEN missing");
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
      m.on("error", (e) => console.error("[ResponseFlowMap]", e?.error?.message || e));
      m.on("load", () => { m.resize(); setOk(true); });
      mRef.current = m;
      if (cRef.current) {
        const ro = new ResizeObserver(() => m.resize());
        ro.observe(cRef.current);
        (m as unknown as { _ro?: ResizeObserver })._ro = ro;
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(dashRef.current);
      const m = mRef.current as unknown as (mapboxgl.Map & { _ro?: ResizeObserver }) | null;
      m?._ro?.disconnect();
      m?.remove();
      mRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ok || !mRef.current) return;
    const m = mRef.current;

    const features: GeoJSON.Feature<GeoJSON.LineString>[] = flows.map((f) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: arcPath(f.from, f.to) },
      properties: {
        severity: f.severity,
        color: SEV_COLOR[f.severity] ?? "#71717a",
        weight: Math.min(4, 1 + Math.log2(1 + f.count)),
      },
    }));
    const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };

    const srcId = "flow-src";
    if (m.getSource(srcId)) {
      (m.getSource(srcId) as mapboxgl.GeoJSONSource).setData(fc);
    } else {
      m.addSource(srcId, { type: "geojson", data: fc });
      m.addLayer({
        id: "flow-glow", type: "line", source: srcId,
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["*", ["get", "weight"], 4],
          "line-blur": 6,
          "line-opacity": 0.35,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      m.addLayer({
        id: "flow-line", type: "line", source: srcId,
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["*", ["get", "weight"], 1.4],
          "line-opacity": 0.9,
          "line-dasharray": [0, 4, 3],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });
    }

    // Station + incident markers (dots at endpoints)
    flows.forEach((f) => {
      const a = document.createElement("div");
      a.style.cssText = "width:10px;height:10px;border-radius:50%;background:#60a5fa;border:1.5px solid #0a0a0e;";
      new mapboxgl.Marker({ element: a, anchor: "center" }).setLngLat(f.from).addTo(m);
      const b = document.createElement("div");
      b.style.cssText = `width:8px;height:8px;border-radius:50%;background:${SEV_COLOR[f.severity] ?? "#71717a"};border:1.5px solid #0a0a0e;box-shadow:0 0 6px ${SEV_COLOR[f.severity] ?? "#71717a"};`;
      new mapboxgl.Marker({ element: b, anchor: "center" }).setLngLat(f.to).addTo(m);
    });

    // Animated marching dashes
    const dashSteps: number[][] = [
      [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
      [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
    ];
    let step = 0, last = 0;
    function tick(now: number) {
      if (now - last > 80) {
        last = now;
        step = (step + 1) % dashSteps.length;
        try { m.setPaintProperty("flow-line", "line-dasharray", dashSteps[step]); } catch {}
      }
      dashRef.current = requestAnimationFrame(tick);
    }
    cancelAnimationFrame(dashRef.current);
    dashRef.current = requestAnimationFrame(tick);
  }, [ok, flows]);

  return (
    <AnalyticsCard
      title="Response Flow Map"
      subtitle="Station → scene flow lines · thickness = count, colour = severity"
      icon={Navigation}
      accent="#3b82f6"
      span={span}
      trailing={<MetaChip accent={flows.length > 0 ? "#3b82f6" : "#71717a"}>{flows.length} flows</MetaChip>}
      footer={<span>Animated dashes show direction of travel · blue dot = station, coloured dot = scene</span>}
    >
      <div className="relative rounded-md overflow-hidden" style={{ height: 260, minHeight: 260, border: "1px solid rgba(255,255,255,0.05)" }}>
        <div ref={cRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        <MapResetButton onReset={() => mRef.current?.flyTo({ ...DEFAULT_VIEW, duration: 700 })} />
        {flows.length === 0 && ok && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center px-4 py-2 rounded-md glass text-[11px]" style={{ color: "#a1a1aa" }}>
              No dispatch flows on file — resolve an incident to populate
            </div>
          </div>
        )}
      </div>
    </AnalyticsCard>
  );
}
