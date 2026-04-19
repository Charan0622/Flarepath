"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff2d2d", high: "#ff7b1c", medium: "#ffc93c", low: "#3ddc84",
};

const STATUS_COLORS: Record<string, string> = {
  assigned: "#ff7b1c", acknowledged: "#ff7b1c", en_route: "#ffc93c", on_scene: "#3ddc84",
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
  vehicle: { call_sign: string; type: string; station_id: string } | null;
  incident: { type: string; severity: string; address: string } | null;
}

interface LiveMapProps {
  onIncidentClick?: (id: string) => void;
  incidents?: Incident[];
  activeDispatches?: ActiveDispatch[];
  selectedIncidentId?: string | null;
}

export default function LiveMap({ onIncidentClick, incidents, activeDispatches, selectedIncidentId }: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const incidentMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const vehicleMarkersRef = useRef<Map<string, { marker: mapboxgl.Marker; progress: number; coords: number[][] }>>(new Map());
  const routeLayersRef = useRef<string[]>([]);
  const animRef = useRef<number>(0);
  const [loaded, setLoaded] = useState(false);

  // Pulse CSS
  useEffect(() => {
    if (document.getElementById("fp-css")) return;
    const s = document.createElement("style");
    s.id = "fp-css";
    s.textContent = `
      @keyframes fp-pulse { 0%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:0.5} 100%{transform:scale(1);opacity:1} }
      @keyframes fp-ring { 0%{transform:scale(0.8);opacity:1} 100%{transform:scale(2.5);opacity:0} }
    `;
    document.head.appendChild(s);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-121.8863, 37.3382],
      zoom: 12,
      pitch: 15,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");
    map.on("load", () => setLoaded(true));
    mapRef.current = map;
    return () => { cancelAnimationFrame(animRef.current); map.remove(); mapRef.current = null; };
  }, []);

  // Station markers (once)
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    STATIONS.forEach((s) => {
      const el = document.createElement("div");
      el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:default;">
        <div style="width:30px;height:30px;border-radius:6px;background:#1e40af;border:2px solid #3b82f6;display:flex;align-items:center;justify-content:center;font-size:15px;">🏢</div>
        <span style="font-size:8px;color:#60a5fa;font-weight:600;text-shadow:0 1px 4px #000;">${s.name}</span>
      </div>`;
      new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat(s.coords).addTo(mapRef.current!);
    });
  }, [loaded]);

  // Incident markers
  useEffect(() => {
    if (!loaded || !mapRef.current || !incidents) return;
    incidentMarkersRef.current.forEach((m) => m.remove());
    incidentMarkersRef.current = [];
    const map = mapRef.current;

    incidents
      .filter((i) => !["resolved", "cancelled"].includes(i.status))
      .forEach((inc) => {
        const coords = INCIDENT_COORDS[inc.address];
        if (!coords) return;
        const color = SEVERITY_COLORS[inc.severity] ?? "#888";
        const isCrit = inc.severity === "critical";
        const isSelected = inc.id === selectedIncidentId;
        const size = isSelected ? 38 : 30;

        const el = document.createElement("div");
        el.innerHTML = `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
          ${isCrit ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${color}25;animation:fp-ring 1.5s ease-out infinite;"></div>` : ""}
          <div style="width:${size - 4}px;height:${size - 4}px;border-radius:50%;background:${color}${isSelected ? "" : "cc"};border:2px solid ${isSelected ? "#fff" : color};display:flex;align-items:center;justify-content:center;font-size:${isSelected ? 16 : 13}px;box-shadow:0 0 ${isSelected ? 24 : 12}px ${color}60;transition:all 0.2s;">🔥</div>
        </div>`;
        el.addEventListener("click", () => onIncidentClick?.(inc.id));
        const marker = new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat(coords).addTo(map);
        incidentMarkersRef.current.push(marker);
      });
  }, [loaded, incidents, onIncidentClick, selectedIncidentId]);

  // Routes — ONLY for selected incident
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const map = mapRef.current;

    // Clear old routes
    routeLayersRef.current.forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
    routeLayersRef.current.forEach((id) => {
      const src = id.replace(/-line$|-glow$/, "");
      try { if (map.getSource(src)) map.removeSource(src); } catch {}
    });
    routeLayersRef.current = [];

    if (!selectedIncidentId || !activeDispatches) return;

    const selected = activeDispatches.filter((d) => d.incident_id === selectedIncidentId && d.route_geojson);
    if (selected.length === 0) return;

    const addedSrcs = new Set<string>();
    selected.forEach((d, i) => {
      const srcId = `sel-route-${i}`;
      if (addedSrcs.has(srcId)) return;
      addedSrcs.add(srcId);

      map.addSource(srcId, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: d.route_geojson! },
      });

      const glowId = `${srcId}-glow`;
      map.addLayer({
        id: glowId, type: "line", source: srcId,
        paint: { "line-color": "#ff2d2d", "line-width": 14, "line-blur": 12, "line-opacity": 0.4 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      routeLayersRef.current.push(glowId);

      const lineId = `${srcId}-line`;
      map.addLayer({
        id: lineId, type: "line", source: srcId,
        paint: { "line-color": "#ff2d2d", "line-width": 5, "line-opacity": 0.95 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      routeLayersRef.current.push(lineId);
    });

    // Fit to selected routes
    const bounds = new mapboxgl.LngLatBounds();
    selected.forEach((d) => d.route_geojson!.coordinates.forEach((c: number[]) => bounds.extend([c[0], c[1]])));
    map.fitBounds(bounds, { padding: 100, duration: 800 });
  }, [loaded, selectedIncidentId, activeDispatches]);

  // Vehicle markers — always visible, animated movement
  useEffect(() => {
    if (!loaded || !mapRef.current || !activeDispatches) return;
    const map = mapRef.current;
    const existing = vehicleMarkersRef.current;
    const currentIds = new Set<string>();

    activeDispatches.forEach((d) => {
      if (!d.vehicle || !d.route_geojson) return;
      const id = d.id;
      currentIds.add(id);
      const coords = d.route_geojson.coordinates;
      const color = STATUS_COLORS[d.status] ?? "#888";

      if (!existing.has(id)) {
        // Create new vehicle marker
        const el = document.createElement("div");
        el.className = `vehicle-${id}`;
        updateVehicleEl(el, d.vehicle.call_sign, d.status, color);

        const startPos = getVehiclePosition(d.status, coords);
        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat(startPos)
          .addTo(map);

        const progress = d.status === "on_scene" ? 1 : d.status === "en_route" ? 0.3 : 0;
        existing.set(id, { marker, progress, coords });
      } else {
        // Update existing marker element
        const entry = existing.get(id)!;
        const el = entry.marker.getElement();
        updateVehicleEl(el, d.vehicle.call_sign, d.status, color);
        entry.coords = coords;
      }
    });

    // Remove vehicles no longer active
    existing.forEach((entry, id) => {
      if (!currentIds.has(id)) {
        entry.marker.remove();
        existing.delete(id);
      }
    });

    // Start animation loop for en_route vehicles
    cancelAnimationFrame(animRef.current);
    function animate() {
      existing.forEach((entry, id) => {
        const dispatch = activeDispatches!.find((d) => d.id === id);
        if (!dispatch || dispatch.status !== "en_route") return;

        entry.progress += 0.001; // Move ~0.1% per frame
        if (entry.progress > 0.95) entry.progress = 0.05; // Loop back

        const idx = Math.floor(entry.progress * (entry.coords.length - 1));
        const c = entry.coords[Math.min(idx, entry.coords.length - 1)];
        entry.marker.setLngLat([c[0], c[1]]);
      });
      animRef.current = requestAnimationFrame(animate);
    }
    animate();

    return () => cancelAnimationFrame(animRef.current);
  }, [loaded, activeDispatches]);

  return <div ref={mapContainer} className="h-full w-full" />;
}

function getVehiclePosition(status: string, coords: number[][]): [number, number] {
  if (status === "on_scene") return coords[coords.length - 1] as [number, number];
  if (status === "en_route") {
    const idx = Math.floor(coords.length * 0.3);
    return coords[idx] as [number, number];
  }
  return coords[0] as [number, number];
}

function updateVehicleEl(el: HTMLElement, callSign: string, status: string, color: string) {
  const isMoving = status === "en_route";
  el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:0;pointer-events:none;">
    <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
      ${isMoving ? `<div style="position:absolute;inset:-2px;border-radius:50%;border:2px solid ${color};animation:fp-ring 2s ease-out infinite;"></div>` : ""}
      <div style="width:36px;height:36px;border-radius:50%;background:#111;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 14px ${color}50;">🚒</div>
    </div>
    <span style="margin-top:-2px;background:${color};color:#000;font-size:7px;font-weight:800;padding:1px 5px;border-radius:3px;white-space:nowrap;">${callSign}</span>
  </div>`;
}
