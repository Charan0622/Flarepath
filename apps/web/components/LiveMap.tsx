"use client";

import { useEffect, useRef, useState } from "react";
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
}

export default function LiveMap({ onIncidentClick }: LiveMapProps) {
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
      center: [-121.8863, 37.3382], // San Jose
      zoom: 12,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("load", () => setLoaded(true));
    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Fetch and render markers
  useEffect(() => {
    if (!loaded || !mapRef.current) return;

    const supabase = createClient();

    async function loadMarkers() {
      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const map = mapRef.current!;

      // Fetch stations
      const { data: stations } = await supabase.from("stations").select("*");
      stations?.forEach((station) => {
        const el = document.createElement("div");
        el.className = "station-marker";
        el.style.cssText = "width:24px;height:24px;border-radius:50%;background:#3b82f6;border:2px solid #1d4ed8;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:10px;";
        el.textContent = "🏠";
        el.title = station.name;

        // Parse WKB hex to get lat/lng — use a simpler approach
        const marker = new mapboxgl.Marker(el);

        // Stations have location as geography, we need to get coordinates
        // For now use the seed data coordinates
        const stationCoords = getStationCoords(station.name);
        if (stationCoords) {
          marker.setLngLat(stationCoords).addTo(map);
          markersRef.current.push(marker);
        }
      });

      // Fetch active incidents
      const { data: incidents } = await supabase
        .from("incidents")
        .select("*")
        .in("status", ["open", "triaged", "dispatched", "on_scene"]);

      incidents?.forEach((incident) => {
        const color = SEVERITY_COLORS[incident.severity] ?? "#888";
        const el = document.createElement("div");
        el.style.cssText = `width:20px;height:20px;border-radius:50%;background:${color};border:2px solid ${color}88;cursor:pointer;box-shadow:0 0 8px ${color}40;`;
        el.title = `${incident.type} - ${incident.address}`;

        const coords = getIncidentCoords(incident.address);
        if (coords) {
          const marker = new mapboxgl.Marker(el)
            .setLngLat(coords)
            .addTo(map);

          el.addEventListener("click", () => onIncidentClick?.(incident.id));
          markersRef.current.push(marker);
        }
      });
    }

    loadMarkers();

    // Subscribe to realtime
    const channel = supabase
      .channel("map-incidents")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => {
        loadMarkers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loaded, onIncidentClick]);

  return (
    <div ref={mapContainer} className="h-full w-full" />
  );
}

// Coordinate lookup from seed data (will be replaced with proper geography parsing later)
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
  return coords[address] ?? null;
}
