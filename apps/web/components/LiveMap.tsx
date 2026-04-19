"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff2d2d", high: "#ff7b1c", medium: "#ffc93c", low: "#3ddc84",
};

const STATIONS = [
  { name: "Station 1", coords: [-121.8900, 37.3394] as [number, number] },
  { name: "Station 7", coords: [-121.9148, 37.3295] as [number, number] },
  { name: "Station 30", coords: [-121.8350, 37.3660] as [number, number] },
];

const INCIDENT_COORDS: Record<string, [number, number]> = {
  "201 S 4th St, San Jose, CA 95112": [-121.8850, 37.3335],
  "70 S 1st St, San Jose, CA 95113": [-121.8890, 37.3340],
  "I-280 at 7th St, San Jose, CA 95112": [-121.8770, 37.3350],
  "345 Park Ave, San Jose, CA 95110": [-121.8916, 37.3318],
  "Alum Rock Park, San Jose, CA 95127": [-121.8230, 37.3862],
  "1073 The Alameda, San Jose, CA 95126": [-121.9070, 37.3430],
  "377 Santana Row, San Jose, CA 95128": [-121.9478, 37.3210],
  "Lincoln Ave & Minnesota Ave, San Jose, CA 95125": [-121.8990, 37.3080],
  "2855 Stevens Creek Blvd, San Jose, CA 95050": [-121.9452, 37.3246],
  "3250 Zanker Rd, San Jose, CA 95134": [-121.9230, 37.4072],
};

interface Incident { id: string; type: string; severity: string; address: string; status: string; }
interface ActiveDispatch {
  id: string; incident_id: string; vehicle_id: string; status: string;
  route_geojson: GeoJSON.LineString | null; distance_m: number | null; eta_seconds: number | null;
  assigned_at?: string; en_route_at?: string; on_scene_at?: string;
  vehicle: { call_sign: string; type: string; station_id: string } | null;
  incident: { type: string; severity: string; address: string } | null;
}

interface LiveMapProps {
  onIncidentClick?: (id: string) => void;
  incidents?: Incident[];
  activeDispatches?: ActiveDispatch[];
  selectedIncidentId?: string | null;
}

// --- Marker Factories (clean SVG, no emoji) ---

function makeIncidentMarker(severity: string, isSelected: boolean): HTMLDivElement {
  const color = SEVERITY_COLORS[severity] ?? "#888";
  const el = document.createElement("div");
  const s = isSelected ? 34 : 26;
  el.style.cssText = `width:${s}px;height:${s}px;cursor:pointer;position:relative;`;
  el.innerHTML = `
    <div style="width:100%;height:100%;border-radius:50%;background:${color};border:${isSelected ? '3px solid #fff' : `2px solid ${color}`};box-shadow:0 0 ${isSelected ? 20 : 10}px ${color}80;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:${isSelected ? 14 : 11}px;line-height:1;">🔥</span>
    </div>`;
  return el;
}

function makeStationMarker(name: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;cursor:default;";
  el.innerHTML = `
    <div style="width:32px;height:32px;border-radius:8px;background:#1e3a5f;border:2px solid #3b82f6;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(59,130,246,0.3);">
      <span style="font-size:16px;line-height:1;">🏢</span>
    </div>
    <span style="font-size:8px;color:#60a5fa;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.9);">${name}</span>`;
  return el;
}

function makeVehicleMarker(callSign: string, status: string, _progress: number): HTMLDivElement {
  const colors: Record<string, string> = {
    assigned: "#6b7280", acknowledged: "#f97316", en_route: "#eab308", on_scene: "#22c55e",
  };
  const color = colors[status] ?? "#6b7280";
  const isMoving = status === "en_route";
  const el = document.createElement("div");
  el.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:1px;pointer-events:none;";
  el.innerHTML = `
    <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
      ${isMoving ? `<div style="position:absolute;inset:-3px;border-radius:50%;border:2px solid ${color}60;animation:fp-ring 2.5s ease-out infinite;"></div>` : ""}
      <div style="width:36px;height:36px;border-radius:50%;background:#18181b;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px ${color}40;">
        <span style="font-size:18px;line-height:1;">🚒</span>
      </div>
    </div>
    <span style="background:${color};color:#000;font-size:7px;font-weight:700;padding:1px 4px;border-radius:3px;white-space:nowrap;margin-top:-2px;">${callSign}</span>`;
  return el;
}

// --- Interpolate position along route based on progress (0-1) ---
function interpolateRoute(coords: number[][], t: number): [number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped === 0) return coords[0] as [number, number];
  if (clamped >= 1) return coords[coords.length - 1] as [number, number];

  // Calculate total route length and find segment
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i][0] - coords[i-1][0];
    const dy = coords[i][1] - coords[i-1][1];
    const len = Math.sqrt(dx*dx + dy*dy);
    segLengths.push(len);
    total += len;
  }

  let target = total * clamped;
  for (let i = 0; i < segLengths.length; i++) {
    if (target <= segLengths[i]) {
      const segT = target / segLengths[i];
      const lng = coords[i][0] + (coords[i+1][0] - coords[i][0]) * segT;
      const lat = coords[i][1] + (coords[i+1][1] - coords[i][1]) * segT;
      return [lng, lat];
    }
    target -= segLengths[i];
  }
  return coords[coords.length - 1] as [number, number];
}

// --- Component ---

export default function LiveMap({ onIncidentClick, incidents, activeDispatches, selectedIncidentId }: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const incidentMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const vehicleDataRef = useRef<Map<string, { marker: mapboxgl.Marker; coords: number[][]; startTime: number; eta: number; status: string }>>(new Map());
  const routeLayersRef = useRef<string[]>([]);
  const animRef = useRef<number>(0);
  const [loaded, setLoaded] = useState(false);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-121.8863, 37.3382],
      zoom: 12,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }), "top-right");
    map.on("load", () => setLoaded(true));
    mapRef.current = map;
    return () => { cancelAnimationFrame(animRef.current); map.remove(); mapRef.current = null; };
  }, []);

  // Stations (once)
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    STATIONS.forEach((s) => {
      new mapboxgl.Marker({ element: makeStationMarker(s.name), anchor: "bottom" })
        .setLngLat(s.coords).addTo(mapRef.current!);
    });
  }, [loaded]);

  // Incident markers — rebuild when selection changes
  useEffect(() => {
    if (!loaded || !mapRef.current || !incidents) return;
    incidentMarkersRef.current.forEach((m) => m.remove());
    incidentMarkersRef.current = [];

    incidents
      .filter((i) => !["resolved", "cancelled"].includes(i.status))
      .forEach((inc) => {
        const coords = INCIDENT_COORDS[inc.address];
        if (!coords) return;
        const el = makeIncidentMarker(inc.severity, inc.id === selectedIncidentId);
        el.addEventListener("click", () => onIncidentClick?.(inc.id));
        incidentMarkersRef.current.push(
          new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat(coords).addTo(mapRef.current!)
        );
      });
  }, [loaded, incidents, selectedIncidentId, onIncidentClick]);

  // Routes — only for selected incident
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const map = mapRef.current;

    // Remove previous route layers and sources
    routeLayersRef.current.forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
    const srcIds = new Set(routeLayersRef.current.map((id) => id.replace(/-line$|-glow$/, "")));
    srcIds.forEach((src) => { try { if (map.getSource(src)) map.removeSource(src); } catch {} });
    routeLayersRef.current = [];

    if (!selectedIncidentId || !activeDispatches) return;

    const selected = activeDispatches.filter((d) => d.incident_id === selectedIncidentId && d.route_geojson);
    if (selected.length === 0) return;

    selected.forEach((d, i) => {
      const srcId = `route-${i}`;
      map.addSource(srcId, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: d.route_geojson! },
      });

      const glowId = `${srcId}-glow`;
      map.addLayer({ id: glowId, type: "line", source: srcId, paint: { "line-color": "#ff2d2d", "line-width": 10, "line-blur": 8, "line-opacity": 0.3 }, layout: { "line-cap": "round", "line-join": "round" } });
      routeLayersRef.current.push(glowId);

      const lineId = `${srcId}-line`;
      map.addLayer({ id: lineId, type: "line", source: srcId, paint: { "line-color": "#ff2d2d", "line-width": 4, "line-opacity": 0.85 }, layout: { "line-cap": "round", "line-join": "round" } });
      routeLayersRef.current.push(lineId);
    });

    const bounds = new mapboxgl.LngLatBounds();
    selected.forEach((d) => d.route_geojson!.coordinates.forEach((c: number[]) => bounds.extend([c[0], c[1]])));
    map.fitBounds(bounds, { padding: 80, duration: 600 });
  }, [loaded, selectedIncidentId, activeDispatches]);

  // Vehicles — always visible, time-based position for en_route
  useEffect(() => {
    if (!loaded || !mapRef.current || !activeDispatches) return;
    const map = mapRef.current;
    const existing = vehicleDataRef.current;
    const activeIds = new Set<string>();

    activeDispatches.forEach((d) => {
      if (!d.vehicle || !d.route_geojson) return;
      activeIds.add(d.id);
      const coords = d.route_geojson.coordinates;

      if (!existing.has(d.id)) {
        // Figure out start time for progress calculation
        // Use en_route_at if available, otherwise assigned_at
        const refTime = d.en_route_at || d.assigned_at || new Date().toISOString();
        const startTime = new Date(refTime).getTime();
        const eta = (d.eta_seconds ?? 600) * 1000; // ms

        const progress = d.status === "on_scene" ? 1 : d.status === "en_route" ? Math.min((Date.now() - startTime) / eta, 0.95) : 0;
        const pos = interpolateRoute(coords, progress);

        const el = makeVehicleMarker(d.vehicle.call_sign, d.status, progress);
        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat(pos).addTo(map);

        existing.set(d.id, { marker, coords, startTime, eta, status: d.status });
      } else {
        const entry = existing.get(d.id)!;
        entry.coords = coords;
        entry.status = d.status;
      }
    });

    // Remove gone vehicles
    existing.forEach((entry, id) => {
      if (!activeIds.has(id)) { entry.marker.remove(); existing.delete(id); }
    });

    // Animation loop — smooth time-based movement
    cancelAnimationFrame(animRef.current);
    let lastUpdate = 0;

    function tick(now: number) {
      // Only update every 100ms to avoid unnecessary DOM thrashing
      if (now - lastUpdate < 100) { animRef.current = requestAnimationFrame(tick); return; }
      lastUpdate = now;

      existing.forEach((entry) => {
        if (entry.status !== "en_route") return;

        const elapsed = Date.now() - entry.startTime;
        const progress = Math.min(elapsed / entry.eta, 0.95);
        const pos = interpolateRoute(entry.coords, progress);
        entry.marker.setLngLat(pos);

        // Position updates are enough — no progress ring to update
      });

      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animRef.current);
  }, [loaded, activeDispatches]);

  return <div ref={mapContainer} className="h-full w-full" />;
}
