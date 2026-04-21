"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Navigation, Flame, DoorOpen, Eye, Compass } from "lucide-react";
import {
  nearestHydrants, positionForTask, crewLngLat,
  ZONE_RADIUS_M, TASKS, type Zone,
} from "@/lib/chief-data";
import type { CrewMember } from "@/lib/crew-data";
import { useMember } from "@/lib/member-store";
import BeaconDrop from "./BeaconDrop";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const METERS_PER_DEG_LAT = 111_320;

interface Props {
  incidentCoords: [number, number] | null;
  stationCoords: [number, number] | null;
  routeGeoJSON: GeoJSON.LineString | null;
  captain: CrewMember | null;
  members: CrewMember[];
  memberBadge: string | null;
  buddyBadge: string | null;
  onBearingUpdate?: (bearingDeg: number, distanceM: number) => void;
  assignedTask: string | null;
}

// Scene tactical mini-map for the firefighter. Renders:
//   - Zone rings (hot/warm/cold)
//   - Red route from station during en-route
//   - Captain position + tether line (cyan) + compass bearing
//   - Buddy partner + braided DNA thread
//   - You (highlighted blue) with bearing cone
//   - Exit spine (green glow back to station/rig)
//   - Nearest hydrants
export default function SceneMiniMap({
  incidentCoords, stationCoords, routeGeoJSON, captain, members, memberBadge, buddyBadge, onBearingUpdate, assignedTask,
}: Props) {
  const cRef = useRef<HTMLDivElement>(null);
  const mRef = useRef<mapboxgl.Map | null>(null);
  const { state, toggleThermal } = useMember();
  const [ok, setOk] = useState(false);

  const defaultCenter: [number, number] = incidentCoords ?? [-121.8863, 37.3382];
  const DEFAULT_VIEW = { center: defaultCenter, zoom: 17.8, pitch: 55, bearing: 0 };

  // Figure out positions: where the member is (based on their assigned task)
  const memberPos = useMemo<[number, number] | null>(() => {
    if (!incidentCoords || !memberBadge) return null;
    const task = assignedTask as Parameters<typeof positionForTask>[0];
    const hint = positionForTask(task, captain?.badge === memberBadge, memberBadge);
    return crewLngLat(incidentCoords[0], incidentCoords[1], hint, Date.now(), memberBadge);
  }, [incidentCoords, memberBadge, captain, assignedTask]);

  const captainPos = useMemo<[number, number] | null>(() => {
    if (!incidentCoords || !captain) return null;
    const hint = positionForTask(null, true, captain.badge);
    return crewLngLat(incidentCoords[0], incidentCoords[1], hint, Date.now(), captain.badge);
  }, [incidentCoords, captain]);

  const buddyPos = useMemo<[number, number] | null>(() => {
    if (!incidentCoords || !buddyBadge) return null;
    const buddy = members.find((m) => m.badge === buddyBadge);
    if (!buddy) return null;
    const hint = positionForTask("primary_search", false, buddy.badge);
    return crewLngLat(incidentCoords[0], incidentCoords[1], hint, Date.now(), buddy.badge);
  }, [incidentCoords, members, buddyBadge]);

  // Init map
  useEffect(() => {
    if (!cRef.current || mRef.current) return;
    if (!mapboxgl.accessToken) return;
    const raf = requestAnimationFrame(() => {
      if (!cRef.current || mRef.current) return;
      const m = new mapboxgl.Map({
        container: cRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        ...DEFAULT_VIEW,
        antialias: true,
      });
      m.on("load", () => { m.resize(); setOk(true); });
      mRef.current = m;
      const ro = new ResizeObserver(() => m.resize());
      ro.observe(cRef.current);
      (m as unknown as { _ro?: ResizeObserver })._ro = ro;
    });
    return () => {
      cancelAnimationFrame(raf);
      const m = mRef.current as unknown as (mapboxgl.Map & { _ro?: ResizeObserver }) | null;
      m?._ro?.disconnect();
      m?.remove();
      mRef.current = null;
    };
  }, []);

  // Thermal mode — apply a FLIR-style white-hot / red-hot CSS filter to the
  // canvas layer. Keeps overlays visible and avoids reloading style.
  useEffect(() => {
    if (!ok || !cRef.current) return;
    const canvas = cRef.current.querySelector(".mapboxgl-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    canvas.style.filter = state.thermalMode
      ? "hue-rotate(-50deg) saturate(2) contrast(1.5) brightness(0.8)"
      : "";
    canvas.style.transition = "filter 400ms ease";
  }, [state.thermalMode, ok]);

  // Zone rings
  useEffect(() => {
    if (!ok || !mRef.current || !incidentCoords) return;
    const m = mRef.current;
    const [lng, lat] = incidentCoords;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const ring = (r_m: number): GeoJSON.Polygon => {
      const coords: [number, number][] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        coords.push([
          lng + Math.cos(theta) * (r_m / (METERS_PER_DEG_LAT * cosLat)),
          lat + Math.sin(theta) * (r_m / METERS_PER_DEG_LAT),
        ]);
      }
      return { type: "Polygon", coordinates: [coords] };
    };
    const zones: { z: Zone; color: string; fill: number }[] = [
      { z: "cold", color: "#3b82f6", fill: 0.03 },
      { z: "warm", color: "#f97316", fill: 0.06 },
      { z: "hot",  color: "#ef4444", fill: 0.1 },
    ];
    const addZones = () => {
      zones.forEach(({ z, color, fill }) => {
        const id = `unit-zone-${z}`;
        const f: GeoJSON.Feature = { type: "Feature", properties: {}, geometry: ring(ZONE_RADIUS_M[z]) };
        if (m.getSource(id)) {
          (m.getSource(id) as mapboxgl.GeoJSONSource).setData(f);
        } else {
          m.addSource(id, { type: "geojson", data: f });
          m.addLayer({ id: `${id}-fill`, type: "fill", source: id, paint: { "fill-color": color, "fill-opacity": fill } });
          m.addLayer({ id: `${id}-line`, type: "line", source: id, paint: { "line-color": color, "line-width": z === "hot" ? 1.5 : 1, "line-opacity": z === "hot" ? 0.6 : 0.35, "line-dasharray": [2, 2] } });
        }
      });
    };
    if (m.isStyleLoaded()) addZones();
    else m.once("styledata", addZones);
  }, [ok, incidentCoords, state.thermalMode]);

  // Route
  useEffect(() => {
    if (!ok || !mRef.current || !routeGeoJSON) return;
    const m = mRef.current;
    const addRoute = () => {
      const src = "unit-route";
      const f: GeoJSON.Feature = { type: "Feature", properties: {}, geometry: routeGeoJSON };
      if (m.getSource(src)) (m.getSource(src) as mapboxgl.GeoJSONSource).setData(f);
      else {
        m.addSource(src, { type: "geojson", data: f });
        m.addLayer({ id: "unit-route-glow", type: "line", source: src, paint: { "line-color": "#ef4444", "line-width": 10, "line-blur": 6, "line-opacity": 0.3 }, layout: { "line-cap": "round", "line-join": "round" } });
        m.addLayer({ id: "unit-route-base", type: "line", source: src, paint: { "line-color": "#ef4444", "line-width": 3, "line-opacity": 0.85 }, layout: { "line-cap": "round", "line-join": "round" } });
      }
    };
    if (m.isStyleLoaded()) addRoute();
    else m.once("styledata", addRoute);
  }, [ok, routeGeoJSON, state.thermalMode]);

  // Exit spine — from member to station/rig
  useEffect(() => {
    if (!ok || !mRef.current || !memberPos || !stationCoords) return;
    const m = mRef.current;
    const add = () => {
      const src = "unit-exit";
      const f: GeoJSON.Feature = {
        type: "Feature", properties: {},
        geometry: { type: "LineString", coordinates: [memberPos, stationCoords] },
      };
      if (m.getSource(src)) (m.getSource(src) as mapboxgl.GeoJSONSource).setData(f);
      else {
        m.addSource(src, { type: "geojson", data: f });
        m.addLayer({ id: "unit-exit-glow", type: "line", source: src,
          paint: { "line-color": "#22c55e", "line-width": 10, "line-blur": 8, "line-opacity": 0.2 }, layout: { "line-cap": "round" } });
        m.addLayer({ id: "unit-exit-line", type: "line", source: src,
          paint: { "line-color": "#22c55e", "line-width": 2, "line-opacity": 0.7, "line-dasharray": [2, 3] }, layout: { "line-cap": "round" } });
      }
    };
    if (m.isStyleLoaded()) add();
    else m.once("styledata", add);
  }, [ok, memberPos, stationCoords, state.thermalMode]);

  // Captain tether
  useEffect(() => {
    if (!ok || !mRef.current || !memberPos || !captainPos) return;
    const m = mRef.current;
    const add = () => {
      const src = "unit-captain-tether";
      const f: GeoJSON.Feature = {
        type: "Feature", properties: {},
        geometry: { type: "LineString", coordinates: [memberPos, captainPos] },
      };
      if (m.getSource(src)) (m.getSource(src) as mapboxgl.GeoJSONSource).setData(f);
      else {
        m.addSource(src, { type: "geojson", data: f });
        m.addLayer({ id: "unit-captain-tether-glow", type: "line", source: src,
          paint: { "line-color": "#60a5fa", "line-width": 4, "line-blur": 4, "line-opacity": 0.55 } });
        m.addLayer({ id: "unit-captain-tether-line", type: "line", source: src,
          paint: { "line-color": "#60a5fa", "line-width": 1.5, "line-opacity": 0.95 } });
      }
    };
    if (m.isStyleLoaded()) add();
    else m.once("styledata", add);

    // Bearing + distance for compass chevron
    if (onBearingUpdate && memberPos && captainPos) {
      const dx = (captainPos[0] - memberPos[0]) * METERS_PER_DEG_LAT * Math.cos((memberPos[1] * Math.PI) / 180);
      const dy = (captainPos[1] - memberPos[1]) * METERS_PER_DEG_LAT;
      const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
      const bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
      onBearingUpdate(bearing, dist);
    }
  }, [ok, memberPos, captainPos, onBearingUpdate, state.thermalMode]);

  // Buddy thread — a braided DNA pattern: two offset sine-wave polylines
  // between member and buddy, rendered as separate source layers.
  useEffect(() => {
    if (!ok || !mRef.current) return;
    const m = mRef.current;
    const srcA = "unit-buddy-strand-a";
    const srcB = "unit-buddy-strand-b";

    const computeBraid = (a: [number, number], b: [number, number], amplitudeM: number, steps: number, phase: number): [number, number][] => {
      const cosLat = Math.cos((a[1] * Math.PI) / 180);
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const length = Math.hypot(dx * cosLat * METERS_PER_DEG_LAT, dy * METERS_PER_DEG_LAT);
      if (length < 1) return [a, b];
      // Perpendicular in deg
      const px = -dy / length;
      const py = dx / length;
      const ampLng = (amplitudeM * px) / (METERS_PER_DEG_LAT * cosLat);
      const ampLat = (amplitudeM * py) / METERS_PER_DEG_LAT;
      const out: [number, number][] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const sineWave = Math.sin(t * Math.PI * 6 + phase);
        const x = a[0] + dx * t + ampLng * sineWave;
        const y = a[1] + dy * t + ampLat * sineWave;
        out.push([x, y]);
      }
      return out;
    };

    const add = () => {
      if (memberPos && buddyPos) {
        const coordsA = computeBraid(memberPos, buddyPos, 3, 60, 0);
        const coordsB = computeBraid(memberPos, buddyPos, 3, 60, Math.PI);
        const fA: GeoJSON.Feature = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coordsA } };
        const fB: GeoJSON.Feature = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coordsB } };

        if (m.getSource(srcA)) (m.getSource(srcA) as mapboxgl.GeoJSONSource).setData(fA);
        else {
          m.addSource(srcA, { type: "geojson", data: fA });
          m.addLayer({ id: "unit-buddy-strand-a", type: "line", source: srcA,
            paint: { "line-color": "#22c55e", "line-width": 2, "line-opacity": 0.9 }, layout: { "line-cap": "round" } });
        }
        if (m.getSource(srcB)) (m.getSource(srcB) as mapboxgl.GeoJSONSource).setData(fB);
        else {
          m.addSource(srcB, { type: "geojson", data: fB });
          m.addLayer({ id: "unit-buddy-strand-b", type: "line", source: srcB,
            paint: { "line-color": "#86efac", "line-width": 1.6, "line-opacity": 0.7 }, layout: { "line-cap": "round" } });
        }
      } else {
        if (m.getLayer("unit-buddy-strand-a")) m.removeLayer("unit-buddy-strand-a");
        if (m.getLayer("unit-buddy-strand-b")) m.removeLayer("unit-buddy-strand-b");
        if (m.getSource(srcA)) m.removeSource(srcA);
        if (m.getSource(srcB)) m.removeSource(srcB);
      }
    };
    if (m.isStyleLoaded()) add();
    else m.once("styledata", add);
  }, [ok, memberPos, buddyPos, state.thermalMode]);

  // Markers: station, incident, member (you), captain, buddy, hydrants
  useEffect(() => {
    if (!ok || !mRef.current || !incidentCoords) return;
    const m = mRef.current;
    const markers: mapboxgl.Marker[] = [];

    // Incident (red flame)
    const incEl = document.createElement("div");
    incEl.innerHTML = `<div style="width:22px;height:22px;border-radius:50%;background:radial-gradient(circle,#ef4444,#991b1b);border:2px solid #fff;box-shadow:0 0 14px rgba(239,68,68,0.8);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;">🔥</div>`;
    markers.push(new mapboxgl.Marker({ element: incEl, anchor: "center" }).setLngLat(incidentCoords).addTo(m));

    // Station
    if (stationCoords) {
      const stEl = document.createElement("div");
      stEl.innerHTML = `<div style="width:16px;height:16px;border-radius:4px;background:#1e3a8a;border:2px solid #60a5fa;box-shadow:0 0 8px rgba(59,130,246,0.5)"></div>`;
      markers.push(new mapboxgl.Marker({ element: stEl, anchor: "center" }).setLngLat(stationCoords).addTo(m));
    }

    // Hydrants
    nearestHydrants(incidentCoords[0], incidentCoords[1], 3).forEach((h) => {
      const el = document.createElement("div");
      el.style.cssText = "width:9px;height:9px;border-radius:50%;background:#06b6d4;border:1.5px solid #0a0a0e;box-shadow:0 0 6px rgba(6,182,212,0.6)";
      el.title = `Hydrant · ${h.flow_gpm} GPM · ${h.distance_m}m`;
      markers.push(new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([h.lng, h.lat]).addTo(m));
    });

    // Captain
    if (captainPos) {
      const cel = document.createElement("div");
      cel.innerHTML = `<div style="width:22px;height:22px;border-radius:50%;background:radial-gradient(circle,#fde68a,#eab308);border:2px solid #fff;box-shadow:0 0 14px rgba(234,179,8,0.7);display:flex;align-items:center;justify-content:center;color:#78350f;font-weight:800;font-size:12px;">★</div>`;
      cel.title = `Capt. ${captain?.name ?? ""}`;
      markers.push(new mapboxgl.Marker({ element: cel, anchor: "center" }).setLngLat(captainPos).addTo(m));
    }

    // Buddy
    if (buddyPos) {
      const bel = document.createElement("div");
      bel.innerHTML = `<div style="width:18px;height:18px;border-radius:50%;background:radial-gradient(circle,#bbf7d0,#16a34a);border:2px solid #fff;box-shadow:0 0 12px rgba(34,197,94,0.65)"></div>`;
      markers.push(new mapboxgl.Marker({ element: bel, anchor: "center" }).setLngLat(buddyPos).addTo(m));
    }

    // You
    if (memberPos) {
      const yEl = document.createElement("div");
      yEl.innerHTML = `<div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;inset:-4px;border-radius:50%;border:1.5px solid #60a5fa90;animation:beacon-pulse 1.5s infinite;--c:#60a5fa60"></div>
        <div style="width:22px;height:22px;border-radius:50%;background:radial-gradient(circle,#bfdbfe,#2563eb);border:2px solid #fff;box-shadow:0 0 16px rgba(59,130,246,0.8)"></div>
      </div>`;
      markers.push(new mapboxgl.Marker({ element: yEl, anchor: "center" }).setLngLat(memberPos).addTo(m));
    }

    return () => markers.forEach((mk) => mk.remove());
  }, [ok, incidentCoords, stationCoords, captainPos, buddyPos, memberPos, captain, state.thermalMode]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
      <div ref={cRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Beacon ring-pulse when a new assignment arrives */}
      <BeaconDrop
        map={mRef.current}
        mapReady={ok}
        target={incidentCoords}
        trigger={assignedTask ?? null}
        color="#ef4444"
      />

      {/* Thermal mode toggle */}
      <button
        onClick={toggleThermal}
        className="absolute top-3 right-3 px-2 py-1 rounded-md flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase transition-all"
        style={{
          background: state.thermalMode ? "rgba(239,68,68,0.25)" : "rgba(8,8,14,0.85)",
          color: state.thermalMode ? "#fecaca" : "#e4e4e7",
          border: `1px solid ${state.thermalMode ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
          boxShadow: state.thermalMode ? "0 0 10px rgba(239,68,68,0.35)" : "0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        <Eye size={10} />
        TIC
      </button>

      {/* Exit button */}
      <button
        onClick={() => {
          if (!mRef.current || !memberPos || !stationCoords) return;
          const bounds = new mapboxgl.LngLatBounds().extend(memberPos).extend(stationCoords);
          mRef.current.fitBounds(bounds, { padding: 60, duration: 700 });
        }}
        className="absolute top-3 left-3 px-2.5 py-1 rounded-md flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
        style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.08))",
          color: "#22c55e",
          border: "1px solid rgba(34,197,94,0.45)",
          boxShadow: "0 0 10px rgba(34,197,94,0.25)",
        }}
      >
        <DoorOpen size={11} />
        Exit
      </button>

      {/* Legend / hints */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-[9px]" style={{ color: "#a1a1aa" }}>
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: "rgba(8,8,14,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />you
        </span>
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: "rgba(8,8,14,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#eab308]" />capt
        </span>
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: "rgba(8,8,14,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />buddy
        </span>
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: "rgba(8,8,14,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />hydrant
        </span>
      </div>
    </div>
  );
}
