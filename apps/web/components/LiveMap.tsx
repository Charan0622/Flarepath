"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff2d2d", high: "#ff7b1c", medium: "#ffc93c", low: "#3ddc84",
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

interface Incident {
  id: string;
  type: string;
  severity: string;
  address: string;
  status: string;
}

interface LiveMapProps {
  onIncidentClick?: (id: string) => void;
  routeGeoJSON?: unknown;
  incidents?: Incident[];
  dispatchedVehicleCoords?: { lng: number; lat: number } | null;
}

function createFireMarkerEl(severity: string): HTMLDivElement {
  const color = SEVERITY_COLORS[severity] ?? "#888";
  const isCritical = severity === "critical";
  const el = document.createElement("div");
  el.innerHTML = `
    <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
      ${isCritical ? `<div style="position:absolute;inset:-4px;border-radius:50%;background:${color}30;animation:pulse-ring 1.5s ease-out infinite;"></div>` : ""}
      <div style="width:32px;height:32px;border-radius:50%;background:radial-gradient(circle at 30% 30%,${color},${color}99);border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 16px ${color}60,0 0 32px ${color}30;transition:transform 0.2s;">
        🔥
      </div>
    </div>
  `;
  el.onmouseenter = () => { const inner = el.querySelector("div > div:last-child") as HTMLElement; if (inner) inner.style.transform = "scale(1.2)"; };
  el.onmouseleave = () => { const inner = el.querySelector("div > div:last-child") as HTMLElement; if (inner) inner.style.transform = "scale(1)"; };
  return el;
}

function createStationMarkerEl(name: string): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = `
    <div style="position:relative;width:40px;height:40px;cursor:pointer;" title="${name}">
      <div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#1e40af,#3b82f6);border:2px solid #60a5fa;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(59,130,246,0.4);transition:transform 0.2s;">
        🏢
      </div>
      <div style="position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:9px;color:#60a5fa;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.8);">
        ${name.replace("SJFD ", "")}
      </div>
    </div>
  `;
  return el;
}

function createVehicleMarkerEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = `
    <div style="position:relative;width:44px;height:44px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:#ff2d2d30;animation:pulse-ring 2s ease-out infinite;"></div>
      <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#dc2626,#ff2d2d);border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 20px rgba(255,45,45,0.6),0 4px 12px rgba(0,0,0,0.4);">
        🚒
      </div>
    </div>
  `;
  return el;
}

export default function LiveMap({ onIncidentClick, routeGeoJSON, incidents, dispatchedVehicleCoords }: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const incidentMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const vehicleMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [loaded, setLoaded] = useState(false);
  const animFrameRef = useRef<number>(0);

  // Inject CSS for pulse animation
  useEffect(() => {
    if (document.getElementById("map-pulse-css")) return;
    const style = document.createElement("style");
    style.id = "map-pulse-css";
    style.textContent = `
      @keyframes pulse-ring {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }
    `;
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
        .setLngLat(s.coords)
        .addTo(mapRef.current!);
    });
  }, [loaded]);

  // Incident markers
  useEffect(() => {
    if (!loaded || !mapRef.current || !incidents) return;
    incidentMarkersRef.current.forEach((m) => m.remove());
    incidentMarkersRef.current = [];

    incidents
      .filter((i) => !["resolved", "cancelled"].includes(i.status))
      .forEach((incident) => {
        const coords = INCIDENT_COORDS[incident.address];
        if (!coords) return;
        const el = createFireMarkerEl(incident.severity);
        el.addEventListener("click", () => onIncidentClick?.(incident.id));

        // Popup on hover
        const popup = new mapboxgl.Popup({ offset: 20, closeButton: false, className: "flarepath-popup" })
          .setHTML(`
            <div style="background:#121214;border:1px solid #2a2a2e;border-radius:8px;padding:8px 12px;color:#ededed;font-size:12px;">
              <div style="font-weight:600;text-transform:capitalize;margin-bottom:2px;">${incident.type.replace(/_/g, " ")}</div>
              <div style="color:#888;font-size:10px;">${incident.address}</div>
              <div style="margin-top:4px;">
                <span style="background:${SEVERITY_COLORS[incident.severity]}20;color:${SEVERITY_COLORS[incident.severity]};padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;">${incident.severity}</span>
              </div>
            </div>
          `);

        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat(coords)
          .setPopup(popup)
          .addTo(mapRef.current!);

        incidentMarkersRef.current.push(marker);
      });
  }, [loaded, incidents, onIncidentClick]);

  // Route rendering with animated drawing
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const map = mapRef.current;

    ["route-line", "route-glow", "route-casing"].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource("route")) map.removeSource("route");
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (!routeGeoJSON) return;

    const geom = routeGeoJSON as GeoJSON.LineString;
    const allCoords = geom.coordinates;

    map.addSource("route", {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
    });

    // Dark casing (underneath)
    map.addLayer({
      id: "route-casing",
      type: "line",
      source: "route",
      paint: { "line-color": "#000", "line-width": 12, "line-opacity": 0.3 },
      layout: { "line-cap": "round", "line-join": "round" },
    });

    // Glow
    map.addLayer({
      id: "route-glow",
      type: "line",
      source: "route",
      paint: { "line-color": "#ff2d2d", "line-width": 14, "line-blur": 12, "line-opacity": 0.5 },
      layout: { "line-cap": "round", "line-join": "round" },
    });

    // Main line
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      paint: { "line-color": "#ff2d2d", "line-width": 5, "line-opacity": 1 },
      layout: { "line-cap": "round", "line-join": "round" },
    });

    // Animate the path drawing
    let step = 0;
    const totalSteps = allCoords.length;
    const speed = 3; // coords per frame

    function animateDraw() {
      step = Math.min(step + speed, totalSteps);
      const partial = allCoords.slice(0, step);
      if (partial.length >= 2) {
        const source = map.getSource("route") as mapboxgl.GeoJSONSource;
        source?.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: partial },
        });
      }
      if (step < totalSteps) {
        animFrameRef.current = requestAnimationFrame(animateDraw);
      }
    }

    // Fit bounds first, then animate
    const bounds = new mapboxgl.LngLatBounds();
    allCoords.forEach((c: number[]) => bounds.extend([c[0], c[1]]));
    map.fitBounds(bounds, { padding: 100, duration: 800 });
    setTimeout(() => animateDraw(), 900);

  }, [loaded, routeGeoJSON]);

  // Vehicle marker (dispatched vehicle moving)
  useEffect(() => {
    if (!loaded || !mapRef.current) return;

    if (!dispatchedVehicleCoords) {
      vehicleMarkerRef.current?.remove();
      vehicleMarkerRef.current = null;
      return;
    }

    if (!vehicleMarkerRef.current) {
      vehicleMarkerRef.current = new mapboxgl.Marker({
        element: createVehicleMarkerEl(),
        anchor: "center",
      }).setLngLat([dispatchedVehicleCoords.lng, dispatchedVehicleCoords.lat])
        .addTo(mapRef.current);
    } else {
      // Smooth transition to new position
      const start = vehicleMarkerRef.current.getLngLat();
      const end = dispatchedVehicleCoords;
      const duration = 1000;
      const startTime = performance.now();

      function animateVehicle(now: number) {
        const t = Math.min((now - startTime) / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out
        const lng = start.lng + (end.lng - start.lng) * eased;
        const lat = start.lat + (end.lat - start.lat) * eased;
        vehicleMarkerRef.current?.setLngLat([lng, lat]);
        if (t < 1) requestAnimationFrame(animateVehicle);
      }
      requestAnimationFrame(animateVehicle);
    }
  }, [loaded, dispatchedVehicleCoords]);

  return <div ref={mapContainer} className="h-full w-full" />;
}
