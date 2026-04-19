"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff2d2d",
  high: "#ff7b1c",
  medium: "#ffc93c",
  low: "#3ddc84",
};

// Static station data — no API call needed
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
}

export default function LiveMap({ onIncidentClick, routeGeoJSON, incidents }: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-121.8863, 37.3382],
      zoom: 12,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("load", () => setLoaded(true));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Add station markers once on load
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const map = mapRef.current;
    STATIONS.forEach((station) => {
      const el = document.createElement("div");
      el.style.cssText = "width:28px;height:28px;border-radius:50%;background:#3b82f6;border:3px solid #1d4ed8;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;";
      el.textContent = "🏠";
      el.title = station.name;
      new mapboxgl.Marker(el).setLngLat(station.coords).addTo(map);
    });
  }, [loaded]);

  // Update incident markers when incidents data changes
  useEffect(() => {
    if (!loaded || !mapRef.current || !incidents) return;
    const map = mapRef.current;

    // Clear old incident markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const active = incidents.filter((i) => !["resolved", "cancelled"].includes(i.status));
    active.forEach((incident) => {
      const color = SEVERITY_COLORS[incident.severity] ?? "#888";
      const el = document.createElement("div");
      el.style.cssText = `width:22px;height:22px;border-radius:50%;background:${color};border:3px solid ${color}88;cursor:pointer;box-shadow:0 0 12px ${color}60;`;
      el.title = `${incident.type.replace(/_/g, " ")} — ${incident.address}`;
      const coords = INCIDENT_COORDS[incident.address];
      if (coords) {
        const marker = new mapboxgl.Marker(el).setLngLat(coords).addTo(map);
        el.addEventListener("click", () => onIncidentClick?.(incident.id));
        markersRef.current.push(marker);
      }
    });
  }, [loaded, incidents, onIncidentClick]);

  // Render route (red path)
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const map = mapRef.current;

    if (map.getLayer("route-line")) map.removeLayer("route-line");
    if (map.getLayer("route-glow")) map.removeLayer("route-glow");
    if (map.getSource("route")) map.removeSource("route");

    if (!routeGeoJSON) return;

    map.addSource("route", {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry: routeGeoJSON as GeoJSON.Geometry },
    });

    map.addLayer({
      id: "route-glow",
      type: "line",
      source: "route",
      paint: { "line-color": "#ff2d2d", "line-width": 12, "line-blur": 8, "line-opacity": 0.4 },
      layout: { "line-cap": "round", "line-join": "round" },
    });

    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      paint: { "line-color": "#ff2d2d", "line-width": 6, "line-opacity": 0.9 },
      layout: { "line-cap": "round", "line-join": "round" },
    });

    const coords = (routeGeoJSON as GeoJSON.LineString).coordinates;
    if (coords?.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((coord: number[]) => bounds.extend([coord[0], coord[1]]));
      map.fitBounds(bounds, { padding: 80, duration: 1000 });
    }
  }, [loaded, routeGeoJSON]);

  return <div ref={mapContainer} className="h-full w-full" />;
}
