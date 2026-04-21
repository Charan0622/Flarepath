"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Target } from "lucide-react";
import AnalyticsCard, { MetaChip } from "./AnalyticsCard";
import MapResetButton from "@/components/MapResetButton";

const DEFAULT_VIEW = { center: [-121.8863, 37.3550] as [number, number], zoom: 10.5, pitch: 0, bearing: 0 };

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface Station { id: string; name: string; lng: number; lat: number }
interface Incident { lng: number; lat: number; severity: string; type: string; created_at: string }

interface Props {
  stations: Station[];
  incidents: Incident[];
  span?: number;
}

// Convert meters → rough lat/lng delta (approx at mid-latitudes)
const METERS_PER_DEG_LAT = 111_320;
function metersToLatLng(lat: number, meters: number): { dLat: number; dLng: number } {
  const dLat = meters / METERS_PER_DEG_LAT;
  const dLng = meters / (METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  return { dLat, dLng };
}

// Generate a rough circular polygon at a given radius for each station.
// Real iso-chrones require the Mapbox Isochrone API — this is a circular
// approximation that renders immediately and still communicates the concept.
function approxIsochrone(lng: number, lat: number, meters: number, steps = 48): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const { dLng } = metersToLatLng(lat, meters);
  const { dLat } = metersToLatLng(lat, meters);
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    coords.push([lng + Math.cos(theta) * dLng, lat + Math.sin(theta) * dLat]);
  }
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
    properties: {},
  };
}

function isInsideAny(incident: { lng: number; lat: number }, stations: Station[], radiusM: number): boolean {
  return stations.some((s) => {
    // Approximate spherical distance
    const dx = (incident.lng - s.lng) * METERS_PER_DEG_LAT * Math.cos((s.lat * Math.PI) / 180);
    const dy = (incident.lat - s.lat) * METERS_PER_DEG_LAT;
    const d = Math.sqrt(dx * dx + dy * dy);
    return d <= radiusM;
  });
}

export default function CoverageIsochrones({ stations, incidents, span = 6 }: Props) {
  const cRef = useRef<HTMLDivElement>(null);
  const mRef = useRef<mapboxgl.Map | null>(null);
  const [ok, setOk] = useState(false);

  // ~urban drive speed 32 km/h -> 4 min = 2.13 km; 8 min = 4.27 km
  const R4 = 2130;
  const R8 = 4270;

  const uncovered = incidents.filter((i) => !isInsideAny(i, stations, R8));
  const partial = incidents.filter((i) => !isInsideAny(i, stations, R4) && isInsideAny(i, stations, R8));
  const covered = incidents.length - uncovered.length - partial.length;

  useEffect(() => {
    if (!cRef.current || mRef.current) return;
    if (!mapboxgl.accessToken) {
      console.error("[CoverageIsochrones] NEXT_PUBLIC_MAPBOX_TOKEN missing");
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
      m.on("error", (e) => console.error("[CoverageIsochrones]", e?.error?.message || e));
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
      const m = mRef.current as unknown as (mapboxgl.Map & { _ro?: ResizeObserver }) | null;
      m?._ro?.disconnect();
      m?.remove();
      mRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ok || !mRef.current || stations.length === 0) return;
    const m = mRef.current;

    const iso4 = {
      type: "FeatureCollection" as const,
      features: stations.map((s) => approxIsochrone(s.lng, s.lat, R4)),
    };
    const iso8 = {
      type: "FeatureCollection" as const,
      features: stations.map((s) => approxIsochrone(s.lng, s.lat, R8)),
    };

    const ensureLayer = (id: string, src: string, paint: Record<string, unknown>) => {
      if (!m.getLayer(id)) {
        m.addLayer({ id, type: "fill", source: src, paint: paint as Record<string, unknown> });
      }
    };
    if (!m.getSource("iso-4")) m.addSource("iso-4", { type: "geojson", data: iso4 });
    else (m.getSource("iso-4") as mapboxgl.GeoJSONSource).setData(iso4);
    if (!m.getSource("iso-8")) m.addSource("iso-8", { type: "geojson", data: iso8 });
    else (m.getSource("iso-8") as mapboxgl.GeoJSONSource).setData(iso8);

    // Layers: 8-min (wider, orange) below; 4-min (red) above
    ensureLayer("iso-8-fill", "iso-8", { "fill-color": "#f97316", "fill-opacity": 0.18 });
    ensureLayer("iso-4-fill", "iso-4", { "fill-color": "#ef4444", "fill-opacity": 0.25 });
    if (!m.getLayer("iso-4-outline")) m.addLayer({ id: "iso-4-outline", type: "line", source: "iso-4", paint: { "line-color": "#ef4444", "line-width": 1.2, "line-opacity": 0.8 } });
    if (!m.getLayer("iso-8-outline")) m.addLayer({ id: "iso-8-outline", type: "line", source: "iso-8", paint: { "line-color": "#f97316", "line-width": 1, "line-opacity": 0.55, "line-dasharray": [2, 2] } });

    // Station markers
    stations.forEach((s) => {
      const el = document.createElement("div");
      el.style.cssText = "width:16px;height:16px;border-radius:50%;background:#60a5fa;border:2px solid #fff;box-shadow:0 0 8px #60a5fa;cursor:default;";
      el.title = s.name;
      new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([s.lng, s.lat]).addTo(m);
    });

    // Uncovered incidents
    uncovered.forEach((i) => {
      const el = document.createElement("div");
      el.style.cssText = "width:10px;height:10px;border-radius:50%;background:#ef4444;border:1.5px solid #fff;box-shadow:0 0 10px #ef4444;animation:beacon-pulse 2s infinite;--c:#ef4444;";
      new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([i.lng, i.lat]).addTo(m);
    });
  }, [ok, stations, incidents, uncovered, R4, R8]);

  const coveragePct = incidents.length > 0 ? Math.round((covered / incidents.length) * 100) : 100;

  return (
    <AnalyticsCard
      title="Station Coverage"
      subtitle="4-minute (red) and 8-minute (orange) drive-time coverage rings per NFPA 1710"
      icon={Target}
      accent="#ef4444"
      span={span}
      trailing={
        <div className="flex items-center gap-2">
          <MetaChip>{stations.length} stations · {incidents.length} inc</MetaChip>
          <MetaChip accent={coveragePct >= 90 ? "#22c55e" : coveragePct >= 75 ? "#eab308" : "#ef4444"}>{coveragePct}% covered</MetaChip>
        </div>
      }
      footer={<span>{uncovered.length} incidents outside 8-min reach · approx isochrones (upgrade to Mapbox Directions for exact polygons)</span>}
    >
      <div className="relative rounded-md overflow-hidden" style={{ height: 260, minHeight: 260, border: "1px solid rgba(255,255,255,0.05)" }}>
        <div ref={cRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        <MapResetButton onReset={() => mRef.current?.flyTo({ ...DEFAULT_VIEW, duration: 700 })} />
        {stations.length === 0 && ok && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center px-4 py-2 rounded-md glass text-[11px]" style={{ color: "#a1a1aa" }}>
              No stations configured for this organisation
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-2 px-2 py-1 rounded-md glass text-[9px]" style={{ color: "#a1a1aa" }}>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(239,68,68,0.55)" }} />4 min</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(249,115,22,0.45)" }} />8 min</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />uncovered</span>
        </div>
      </div>
    </AnalyticsCard>
  );
}
