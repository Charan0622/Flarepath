"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff2d2d", high: "#ff7b1c", medium: "#ffc93c", low: "#3ddc84",
};

const DISPATCH_STATUS_COLORS: Record<string, string> = {
  assigned: "#ff2d2d", acknowledged: "#ff7b1c", en_route: "#ffc93c", on_scene: "#3ddc84",
};

const STATIONS = [
  { name: "SJFD Station 1", coords: [-121.8900, 37.3394] as [number, number] },
  { name: "SJFD Station 7", coords: [-121.9148, 37.3295] as [number, number] },
  { name: "SJFD Station 30", coords: [-121.8350, 37.3660] as [number, number] },
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

const STATION_COORDS: Record<string, [number, number]> = {
  "fcf13ccd-c48b-454e-9880-1bac61c187b6": [-121.8900, 37.3394],
  "55a9c33d-6e0b-43c4-a026-89e6833570c2": [-121.9148, 37.3295],
  "13402c9f-d7bb-42fe-91df-fb3b4e737eb1": [-121.8350, 37.3660],
};

interface Incident { id: string; type: string; severity: string; address: string; status: string; }
interface ActiveDispatch {
  id: string;
  incident_id: string;
  vehicle_id: string;
  status: string;
  route_geojson: GeoJSON.LineString | null;
  distance_m: number | null;
  eta_seconds: number | null;
  vehicle: { call_sign: string; type: string; station_id: string } | null;
  incident: { type: string; severity: string; address: string } | null;
}

interface LiveMapProps {
  onIncidentClick?: (id: string) => void;
  incidents?: Incident[];
  activeDispatches?: ActiveDispatch[];
  selectedIncidentId?: string | null;
}

function createFireMarkerEl(severity: string): HTMLDivElement {
  const color = SEVERITY_COLORS[severity] ?? "#888";
  const isCritical = severity === "critical";
  const el = document.createElement("div");
  el.innerHTML = `
    <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
      ${isCritical ? `<div style="position:absolute;inset:-4px;border-radius:50%;background:${color}30;animation:pulse-ring 1.5s ease-out infinite;"></div>` : ""}
      <div style="width:32px;height:32px;border-radius:50%;background:radial-gradient(circle at 30% 30%,${color},${color}99);border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 16px ${color}60,0 0 32px ${color}30;transition:transform 0.2s;">🔥</div>
    </div>`;
  el.onmouseenter = () => { const d = el.querySelector("div > div:last-child") as HTMLElement; if (d) d.style.transform = "scale(1.2)"; };
  el.onmouseleave = () => { const d = el.querySelector("div > div:last-child") as HTMLElement; if (d) d.style.transform = "scale(1)"; };
  return el;
}

function createStationMarkerEl(name: string): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = `
    <div style="position:relative;width:40px;height:48px;cursor:pointer;" title="${name}">
      <div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#1e40af,#3b82f6);border:2px solid #60a5fa;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(59,130,246,0.4);">🏢</div>
      <div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:9px;color:#60a5fa;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.8);">${name.replace("SJFD ", "")}</div>
    </div>`;
  return el;
}

function createVehicleMarkerEl(callSign: string, status: string): HTMLDivElement {
  const color = DISPATCH_STATUS_COLORS[status] ?? "#888";
  const isMoving = status === "en_route";
  const el = document.createElement("div");
  el.innerHTML = `
    <div style="position:relative;width:56px;height:56px;display:flex;align-items:center;justify-content:center;">
      ${isMoving ? `<div style="position:absolute;inset:0;border-radius:50%;border:2px solid ${color};animation:pulse-ring 2s ease-out infinite;"></div>` : ""}
      <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#1a1a1e,#121214);border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 0 20px ${color}40,0 4px 12px rgba(0,0,0,0.5);">🚒</div>
      <div style="position:absolute;bottom:-12px;left:50%;transform:translateX(-50%);white-space:nowrap;background:${color};color:#000;font-size:8px;font-weight:800;padding:1px 5px;border-radius:4px;letter-spacing:0.5px;">${callSign}</div>
      <div style="position:absolute;top:-8px;right:-4px;background:${color};color:#000;font-size:7px;font-weight:700;padding:1px 4px;border-radius:3px;text-transform:uppercase;">${status.replace(/_/g, " ")}</div>
    </div>`;
  return el;
}

export default function LiveMap({ onIncidentClick, incidents, activeDispatches, selectedIncidentId }: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const incidentMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const vehicleMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const routeLayerIdsRef = useRef<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Inject pulse CSS
  useEffect(() => {
    if (document.getElementById("map-pulse-css")) return;
    const style = document.createElement("style");
    style.id = "map-pulse-css";
    style.textContent = `@keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }`;
    document.head.appendChild(style);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-121.8863, 37.3382],
      zoom: 12,
      pitch: 20,
      antialias: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");
    map.on("load", () => setLoaded(true));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Station markers (once)
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    STATIONS.forEach((s) => {
      new mapboxgl.Marker({ element: createStationMarkerEl(s.name), anchor: "center" })
        .setLngLat(s.coords).addTo(mapRef.current!);
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
      .forEach((incident) => {
        const coords = INCIDENT_COORDS[incident.address];
        if (!coords) return;
        const el = createFireMarkerEl(incident.severity);
        el.addEventListener("click", () => onIncidentClick?.(incident.id));
        const marker = new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat(coords).addTo(map);
        incidentMarkersRef.current.push(marker);
      });
  }, [loaded, incidents, onIncidentClick]);

  // ALL active routes + vehicle markers simultaneously
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const map = mapRef.current;

    // Clear old routes
    routeLayerIdsRef.current.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    routeLayerIdsRef.current.forEach((id) => {
      const srcId = id.replace(/-line$|-glow$|-casing$/, "");
      if (map.getSource(srcId) && !routeLayerIdsRef.current.some((lid) => lid !== id && lid.startsWith(srcId) && map.getLayer(lid))) {
        map.removeSource(srcId);
      }
    });
    routeLayerIdsRef.current = [];

    // Clear old vehicle markers
    vehicleMarkersRef.current.forEach((m) => m.remove());
    vehicleMarkersRef.current = [];

    if (!activeDispatches || activeDispatches.length === 0) return;

    const addedSources = new Set<string>();

    activeDispatches.forEach((dispatch, idx) => {
      if (!dispatch.route_geojson) return;

      const isSelected = dispatch.incident_id === selectedIncidentId;
      const opacity = isSelected ? 1 : 0.5;
      const width = isSelected ? 6 : 3;
      const srcId = `route-${idx}`;

      if (!addedSources.has(srcId)) {
        map.addSource(srcId, {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: dispatch.route_geojson },
        });
        addedSources.add(srcId);
      }

      // Glow
      const glowId = `${srcId}-glow`;
      map.addLayer({
        id: glowId,
        type: "line",
        source: srcId,
        paint: { "line-color": "#ff2d2d", "line-width": width * 2.5, "line-blur": 10, "line-opacity": opacity * 0.35 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      routeLayerIdsRef.current.push(glowId);

      // Line
      const lineId = `${srcId}-line`;
      map.addLayer({
        id: lineId,
        type: "line",
        source: srcId,
        paint: { "line-color": "#ff2d2d", "line-width": width, "line-opacity": opacity },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      routeLayerIdsRef.current.push(lineId);

      // Vehicle marker at the appropriate position along the route
      if (dispatch.vehicle) {
        const coords = dispatch.route_geojson.coordinates;
        let vehiclePos: [number, number];

        if (dispatch.status === "on_scene") {
          // At the destination
          vehiclePos = coords[coords.length - 1] as [number, number];
        } else if (dispatch.status === "en_route") {
          // Simulate position ~40% along the route
          const mid = Math.floor(coords.length * 0.4);
          vehiclePos = coords[mid] as [number, number];
        } else {
          // At the station (origin)
          vehiclePos = coords[0] as [number, number];
        }

        const vehicleEl = createVehicleMarkerEl(dispatch.vehicle.call_sign, dispatch.status);
        const vehicleMarker = new mapboxgl.Marker({ element: vehicleEl, anchor: "center" })
          .setLngLat(vehiclePos)
          .addTo(map);
        vehicleMarkersRef.current.push(vehicleMarker);
      }
    });

    // If an incident is selected, fit to its route
    if (selectedIncidentId) {
      const selectedDispatches = activeDispatches.filter((d) => d.incident_id === selectedIncidentId && d.route_geojson);
      if (selectedDispatches.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        selectedDispatches.forEach((d) => {
          d.route_geojson!.coordinates.forEach((c: number[]) => bounds.extend([c[0], c[1]]));
        });
        map.fitBounds(bounds, { padding: 100, duration: 800 });
      }
    }
  }, [loaded, activeDispatches, selectedIncidentId]);

  return <div ref={mapContainer} className="h-full w-full" />;
}
