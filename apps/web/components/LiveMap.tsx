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
  const size = isSelected ? 20 : 14;
  const ring = isSelected ? 30 : 22;
  const el = document.createElement("div");
  el.style.cssText = `width:${ring}px;height:${ring}px;cursor:pointer;display:flex;align-items:center;justify-content:center;`;
  el.innerHTML = `
    <svg width="${ring}" height="${ring}" viewBox="0 0 ${ring} ${ring}">
      <circle cx="${ring/2}" cy="${ring/2}" r="${ring/2-1}" fill="${color}20" stroke="${isSelected ? '#fff' : color}" stroke-width="${isSelected ? 2 : 1.5}" />
      <circle cx="${ring/2}" cy="${ring/2}" r="${size/2}" fill="${color}" />
    </svg>`;
  return el;
}

function makeStationMarker(name: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:3px;cursor:default;";
  el.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#1e3a5f" stroke="#3b82f6" stroke-width="1.5"/>
      <rect x="7" y="10" width="4" height="6" rx="0.5" fill="#3b82f6" opacity="0.6"/>
      <rect x="13" y="10" width="4" height="6" rx="0.5" fill="#3b82f6" opacity="0.6"/>
      <rect x="9" y="4" width="6" height="4" rx="1" fill="#3b82f6" opacity="0.4"/>
    </svg>
    <span style="font-size:9px;color:#60a5fa;font-weight:500;opacity:0.8;">${name}</span>`;
  return el;
}

function makeVehicleMarker(callSign: string, status: string, progress: number): HTMLDivElement {
  const colors: Record<string, string> = {
    assigned: "#888", acknowledged: "#ff7b1c", en_route: "#ffc93c", on_scene: "#3ddc84",
  };
  const color = colors[status] ?? "#888";
  const el = document.createElement("div");
  el.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:1px;pointer-events:none;";

  // Progress ring for en_route
  const circumference = 2 * Math.PI * 15;
  const dashoffset = circumference * (1 - progress);

  el.innerHTML = `
    <div style="position:relative;width:36px;height:36px;">
      <svg width="36" height="36" viewBox="0 0 36 36" style="position:absolute;top:0;left:0;transform:rotate(-90deg);">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#222" stroke-width="2.5"/>
        ${status === "en_route" ? `<circle cx="18" cy="18" r="15" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="${circumference}" stroke-dashoffset="${dashoffset}" stroke-linecap="round" style="transition:stroke-dashoffset 2s ease;"/>` : ""}
      </svg>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${status === "on_scene" ? color : "#ccc"}">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
          <circle cx="7.5" cy="14.5" r="1.5"/>
          <circle cx="16.5" cy="14.5" r="1.5"/>
        </svg>
      </div>
    </div>
    <span style="font-size:8px;font-weight:600;color:${color};letter-spacing:0.3px;white-space:nowrap;">${callSign}</span>`;
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

        // Update the progress ring
        const el = entry.marker.getElement();
        const progressCircle = el.querySelector("circle:nth-child(2)") as SVGCircleElement | null;
        if (progressCircle) {
          const circumference = 2 * Math.PI * 15;
          progressCircle.setAttribute("stroke-dashoffset", String(circumference * (1 - progress)));
        }
      });

      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animRef.current);
  }, [loaded, activeDispatches]);

  return <div ref={mapContainer} className="h-full w-full" />;
}
