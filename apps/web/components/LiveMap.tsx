"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { createClient } from "@/lib/supabase/client";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff2d2d",
  high: "#ff7b1c",
  medium: "#ffc93c",
  low: "#3ddc84",
};

interface LiveMapProps {
  onIncidentClick?: (id: string) => void;
  routeGeoJSON?: unknown;
}

export default function LiveMap({ onIncidentClick, routeGeoJSON }: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Initialize map
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

  const loadMarkers = useCallback(async () => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const map = mapRef.current;
    const supabase = createClient();

    // Stations
    const { data: stations } = await supabase.from("stations").select("*");
    stations?.forEach((station) => {
      const el = document.createElement("div");
      el.style.cssText = "width:28px;height:28px;border-radius:50%;background:#3b82f6;border:3px solid #1d4ed8;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;";
      el.textContent = "🏠";
      el.title = station.name;
      const coords = getStationCoords(station.name);
      if (coords) {
        markersRef.current.push(new mapboxgl.Marker(el).setLngLat(coords).addTo(map));
      }
    });

    // Active incidents
    const { data: incidents } = await supabase
      .from("incidents")
      .select("*")
      .in("status", ["open", "triaged", "dispatched", "on_scene"]);

    incidents?.forEach((incident) => {
      const color = SEVERITY_COLORS[incident.severity] ?? "#888";
      const el = document.createElement("div");
      el.style.cssText = `width:22px;height:22px;border-radius:50%;background:${color};border:3px solid ${color}88;cursor:pointer;box-shadow:0 0 12px ${color}60;`;
      el.title = `${incident.type} - ${incident.address}`;
      const coords = getIncidentCoords(incident.address);
      if (coords) {
        const marker = new mapboxgl.Marker(el).setLngLat(coords).addTo(map);
        el.addEventListener("click", () => onIncidentClick?.(incident.id));
        markersRef.current.push(marker);
      }
    });
  }, [onIncidentClick]);

  // Load markers on map load
  useEffect(() => {
    if (!loaded) return;
    loadMarkers();

    const supabase = createClient();
    const channel = supabase
      .channel("map-incidents")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => loadMarkers())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loaded, loadMarkers]);

  // Render route (red path)
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const map = mapRef.current;

    // Remove existing route layer/source
    if (map.getLayer("route-line")) map.removeLayer("route-line");
    if (map.getLayer("route-glow")) map.removeLayer("route-glow");
    if (map.getSource("route")) map.removeSource("route");

    if (!routeGeoJSON) return;

    map.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: routeGeoJSON as GeoJSON.Geometry,
      },
    });

    // Glow layer (underneath)
    map.addLayer({
      id: "route-glow",
      type: "line",
      source: "route",
      paint: {
        "line-color": "#ff2d2d",
        "line-width": 12,
        "line-blur": 8,
        "line-opacity": 0.4,
      },
      layout: { "line-cap": "round", "line-join": "round" },
    });

    // Main line
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      paint: {
        "line-color": "#ff2d2d",
        "line-width": 6,
        "line-opacity": 0.9,
      },
      layout: { "line-cap": "round", "line-join": "round" },
    });

    // Fit bounds to route
    const coords = (routeGeoJSON as GeoJSON.LineString).coordinates;
    if (coords && coords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((coord: number[]) => bounds.extend([coord[0], coord[1]]));
      map.fitBounds(bounds, { padding: 80, duration: 1000 });
    }
  }, [loaded, routeGeoJSON]);

  return <div ref={mapContainer} className="h-full w-full" />;
}

function getStationCoords(name: string): [number, number] | null {
  const coords: Record<string, [number, number]> = {
    "SJFD Station 1": [-121.8900, 37.3394],
    "SJFD Station 7": [-121.9148, 37.3295],
    "SJFD Station 30": [-121.8350, 37.3660],
  };
  return coords[name] ?? null;
}

function getIncidentCoords(address: string): [number, number] | null {
  const coords: Record<string, [number, number]> = {
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
  if (coords[address]) return coords[address];
  for (const [key, val] of Object.entries(coords)) {
    if (address.includes(key.split(",")[0])) return val;
  }
  return null;
}
