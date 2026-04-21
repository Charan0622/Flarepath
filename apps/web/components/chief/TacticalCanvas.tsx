"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapResetButton from "@/components/MapResetButton";
import { useChief } from "@/lib/chief-store";
import {
  nearestHydrants, demoWeather,
  positionForTask, ZONE_COLOR, ZONE_RADIUS_M, type Zone,
  TASKS, crewJourneyPosition, type CrewPhase,
} from "@/lib/chief-data";
import { useUnit } from "@/lib/crew-store";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface Props {
  incidentCoords: [number, number] | null;
  stationCoords: [number, number] | null;
  routeGeoJSON: GeoJSON.LineString | null;
  incidentAddress: string;
  severity: string;
  unitCallSign: string | null;
}

const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};

export default function TacticalCanvas({ incidentCoords, stationCoords, routeGeoJSON, incidentAddress, severity, unitCallSign }: Props) {
  const cRef = useRef<HTMLDivElement>(null);
  const mRef = useRef<mapboxgl.Map | null>(null);
  const dashRafRef = useRef<number>(0);
  const crewRafRef = useRef<number>(0);
  const crewMarkersRef = useRef<Map<string, { mk: mapboxgl.Marker; el: HTMLElement; hint: ReturnType<typeof positionForTask> }>>(new Map());
  const chevronMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const journeyStartRef = useRef<number>(0);
  const [ok, setOk] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { state } = useChief();
  const unit = useUnit(unitCallSign);
  const weather = demoWeather(incidentAddress);

  // Build crew position plan from assignments
  const crewPlan = useMemo(() => {
    if (!unit) return [] as { badge: string; name: string; task: typeof TASKS[number]["key"] | null; color: string; captain: boolean; hint: ReturnType<typeof positionForTask> }[];
    const assignmentByBadge = new Map(state.assignments.map((a) => [a.badge, a.task]));
    const all = [
      ...(unit.captain ? [{ ...unit.captain, isCaptain: true }] : []),
      ...unit.members.map((m) => ({ ...m, isCaptain: false })),
    ];
    return all.map((m) => {
      const task = assignmentByBadge.get(m.badge) ?? null;
      const taskMeta = task ? TASKS.find((t) => t.key === task) : null;
      return {
        badge: m.badge,
        name: m.name,
        task,
        color: m.isCaptain ? "#eab308" : (taskMeta?.color ?? "#a1a1aa"),
        captain: m.isCaptain,
        hint: positionForTask(task, m.isCaptain, m.badge),
      };
    });
  }, [unit, state.assignments]);

  const defaultCenter = incidentCoords ?? [-121.8863, 37.3382];
  const DEFAULT_VIEW = { center: defaultCenter as [number, number], zoom: 17.5, pitch: 50, bearing: 0 };

  // Init
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
      m.addControl(new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: true }), "bottom-right");
      m.on("load", () => {
        m.resize();
        // 3D buildings for context
        const layers = m.getStyle().layers;
        const lbl = layers?.find((l) => l.type === "symbol" && (l.layout as Record<string, unknown>)?.["text-field"]);
        if (lbl) {
          m.addLayer({
            id: "3d-tactical", source: "composite", "source-layer": "building",
            filter: ["==", "extrude", "true"], type: "fill-extrusion", minzoom: 14,
            paint: { "fill-extrusion-color": "#0c0c14", "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "min_height"], "fill-extrusion-opacity": 0.5 },
          }, lbl.id);
        }
        setOk(true);
      });
      mRef.current = m;
      const ro = new ResizeObserver(() => m.resize());
      ro.observe(cRef.current);
      (m as unknown as { _ro?: ResizeObserver })._ro = ro;
    });
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(dashRafRef.current);
      cancelAnimationFrame(crewRafRef.current);
      // Clear crew markers before destroying the map so we don't hold refs
      // to removed mapboxgl.Marker instances on hot-reload.
      crewMarkersRef.current.forEach((rec) => { try { rec.mk.remove(); } catch {} });
      crewMarkersRef.current.clear();
      const m = mRef.current as unknown as (mapboxgl.Map & { _ro?: ResizeObserver }) | null;
      m?._ro?.disconnect();
      m?.remove();
      mRef.current = null;
    };
  }, []);

  // Route (red flarepath) — three-layer line + chevron arrows showing direction
  useEffect(() => {
    if (!ok || !mRef.current || !routeGeoJSON) return;
    const m = mRef.current;
    const src = "chief-route";
    if (!m.getSource(src)) {
      m.addSource(src, { type: "geojson", data: { type: "Feature", properties: {}, geometry: routeGeoJSON } });
      // Brighter, more visible glow
      m.addLayer({ id: "chief-route-glow", type: "line", source: src,
        paint: { "line-color": "#ef4444", "line-width": 16, "line-blur": 10, "line-opacity": 0.4 },
        layout: { "line-cap": "round", "line-join": "round" } });
      m.addLayer({ id: "chief-route-base", type: "line", source: src,
        paint: { "line-color": "#ef4444", "line-width": 5, "line-opacity": 0.95 },
        layout: { "line-cap": "round", "line-join": "round" } });
      m.addLayer({ id: "chief-route-flow", type: "line", source: src,
        paint: { "line-color": "#ffffff", "line-width": 2, "line-opacity": 1, "line-dasharray": [0, 4, 3] },
        layout: { "line-cap": "round", "line-join": "round" } });
    } else {
      (m.getSource(src) as mapboxgl.GeoJSONSource).setData({ type: "Feature", properties: {}, geometry: routeGeoJSON });
    }

    // Marching dashes along the flow line — monotonic offset progression so
    // the bright white dashes appear to travel from station → scene.
    const dashSteps: number[][] = Array.from({ length: 14 }, (_, i) => {
      const off = i * 0.5;
      return [off, 4, 3];
    });
    let step = 0, last = 0;
    function tick(now: number) {
      if (now - last > 70) {
        last = now; step = (step + 1) % dashSteps.length;
        try { m.setPaintProperty("chief-route-flow", "line-dasharray", dashSteps[step]); } catch {}
      }
      dashRafRef.current = requestAnimationFrame(tick);
    }
    cancelAnimationFrame(dashRafRef.current);
    dashRafRef.current = requestAnimationFrame(tick);

    // ─── Chevron arrows along the route ─────────────────────────
    // Sample the route every ~180m and place a rotated chevron there.
    chevronMarkersRef.current.forEach((mk) => mk.remove());
    chevronMarkersRef.current = [];
    const coords = routeGeoJSON.coordinates as [number, number][];
    if (coords.length >= 2) {
      const spacing_m = 180;
      const METERS_PER_DEG_LAT = 111_320;

      const segLen: number[] = [];
      let totalLen = 0;
      for (let i = 1; i < coords.length; i++) {
        const [lng1, lat1] = coords[i - 1];
        const [lng2, lat2] = coords[i];
        const cosLat = Math.cos((lat1 * Math.PI) / 180);
        const dx = (lng2 - lng1) * METERS_PER_DEG_LAT * cosLat;
        const dy = (lat2 - lat1) * METERS_PER_DEG_LAT;
        const d = Math.sqrt(dx * dx + dy * dy);
        segLen.push(d);
        totalLen += d;
      }

      const chevrons: { pos: [number, number]; bearing: number }[] = [];
      let target = spacing_m;
      let acc = 0;
      for (let i = 0; i < segLen.length; i++) {
        const end = acc + segLen[i];
        while (target < end) {
          const t = (target - acc) / segLen[i];
          const [lng1, lat1] = coords[i];
          const [lng2, lat2] = coords[i + 1];
          const lng = lng1 + (lng2 - lng1) * t;
          const lat = lat1 + (lat2 - lat1) * t;
          const bearing = (Math.atan2(lng2 - lng1, lat2 - lat1) * 180) / Math.PI;
          chevrons.push({ pos: [lng, lat], bearing });
          target += spacing_m;
        }
        acc = end;
      }

      chevrons.forEach(({ pos, bearing }) => {
        const el = document.createElement("div");
        el.style.cssText = `width:14px;height:14px;display:flex;align-items:center;justify-content:center;transform:rotate(${bearing}deg);pointer-events:none`;
        el.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff" style="filter:drop-shadow(0 0 4px rgba(239,68,68,0.9))"><path d="M12 4 L20 18 L12 14 L4 18 Z"/></svg>`;
        const mk = new mapboxgl.Marker({ element: el, anchor: "center", rotationAlignment: "map" }).setLngLat(pos).addTo(m);
        chevronMarkersRef.current.push(mk);
      });
    }

    // Fit bounds — show the whole route on first load so the direction is obvious
    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach((c) => bounds.extend([c[0], c[1]]));
    m.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 80, right: 80 }, duration: 1200, maxZoom: 16.5 });
  }, [ok, routeGeoJSON]);

  // Hot/Warm/Cold operational zones — concentric rings around the incident
  useEffect(() => {
    if (!ok || !mRef.current || !incidentCoords) return;
    const m = mRef.current;
    const [lng, lat] = incidentCoords;
    const METERS_PER_DEG_LAT = 111_320;
    const cosLat = Math.cos((lat * Math.PI) / 180);

    const ringPolygon = (radius_m: number): GeoJSON.Polygon => {
      const coords: [number, number][] = [];
      const steps = 64;
      const dLat = radius_m / METERS_PER_DEG_LAT;
      const dLng = radius_m / (METERS_PER_DEG_LAT * cosLat);
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        coords.push([lng + Math.cos(theta) * dLng, lat + Math.sin(theta) * dLat]);
      }
      return { type: "Polygon", coordinates: [coords] };
    };

    const zones: Zone[] = ["cold", "warm", "hot"]; // outermost first so hot renders on top
    zones.forEach((z) => {
      const srcId = `chief-zone-${z}`;
      const feature: GeoJSON.Feature = { type: "Feature", properties: {}, geometry: ringPolygon(ZONE_RADIUS_M[z]) };
      if (m.getSource(srcId)) {
        (m.getSource(srcId) as mapboxgl.GeoJSONSource).setData(feature);
      } else {
        m.addSource(srcId, { type: "geojson", data: feature });
        m.addLayer({
          id: `${srcId}-fill`, type: "fill", source: srcId,
          paint: {
            "fill-color": ZONE_COLOR[z],
            "fill-opacity": z === "hot" ? 0.1 : z === "warm" ? 0.06 : 0.03,
          },
        });
        m.addLayer({
          id: `${srcId}-outline`, type: "line", source: srcId,
          paint: {
            "line-color": ZONE_COLOR[z],
            "line-width": z === "hot" ? 1.5 : 1,
            "line-opacity": z === "hot" ? 0.6 : 0.35,
            "line-dasharray": [2, 2],
          },
        });
      }
    });
  }, [ok, incidentCoords]);

  // Plume cone — wind direction driven
  useEffect(() => {
    if (!ok || !mRef.current || !incidentCoords) return;
    const m = mRef.current;
    const [lng, lat] = incidentCoords;
    const windRad = (weather.wind_deg * Math.PI) / 180;
    // Build a triangular cone starting at the incident and extending downwind
    const lenDeg = 0.004 + weather.wind_kph * 0.00015;
    const halfWidth = 0.0008 + weather.wind_kph * 0.00008;
    const tipLng = lng + Math.sin(windRad) * lenDeg;
    const tipLat = lat + Math.cos(windRad) * lenDeg;
    const perpLng = Math.sin(windRad + Math.PI / 2);
    const perpLat = Math.cos(windRad + Math.PI / 2);
    const poly: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [[
        [lng, lat],
        [tipLng + perpLng * halfWidth, tipLat + perpLat * halfWidth],
        [tipLng - perpLng * halfWidth, tipLat - perpLat * halfWidth],
        [lng, lat],
      ]],
    };
    const src = "chief-plume";
    const fc: GeoJSON.Feature = { type: "Feature", properties: {}, geometry: poly };
    if (!m.getSource(src)) {
      m.addSource(src, { type: "geojson", data: fc });
      m.addLayer({ id: "chief-plume-fill", type: "fill", source: src,
        paint: { "fill-color": "#f97316", "fill-opacity": 0.22 } });
      m.addLayer({ id: "chief-plume-outline", type: "line", source: src,
        paint: { "line-color": "#f97316", "line-width": 1, "line-opacity": 0.5, "line-dasharray": [2, 2] } });
    } else {
      (m.getSource(src) as mapboxgl.GeoJSONSource).setData(fc);
    }
  }, [ok, incidentCoords, weather.wind_deg, weather.wind_kph]);

  // Hydrant markers
  useEffect(() => {
    if (!ok || !mRef.current || !incidentCoords) return;
    const m = mRef.current;
    const hydrants = nearestHydrants(incidentCoords[0], incidentCoords[1], 3);
    hydrants.forEach((h) => {
      const el = document.createElement("div");
      el.style.cssText = "width:12px;height:12px;border-radius:50%;background:#06b6d4;border:2px solid #0a0a0e;box-shadow:0 0 8px rgba(6,182,212,0.6);cursor:default";
      el.title = `Hydrant · ${h.flow_gpm} GPM · ${h.distance_m}m away`;
      new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([h.lng, h.lat]).addTo(m);
    });
  }, [ok, incidentCoords]);

  // Station marker
  useEffect(() => {
    if (!ok || !mRef.current || !stationCoords) return;
    const el = document.createElement("div");
    el.innerHTML = `<div style="width:20px;height:20px;border-radius:6px;background:#1e3a8a;border:2px solid #60a5fa;box-shadow:0 0 10px rgba(59,130,246,0.5)"></div>`;
    el.title = "Apparatus station";
    new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat(stationCoords).addTo(mRef.current);
  }, [ok, stationCoords]);

  // ─── Live crew markers — 3-phase journey animation ───────────
  // Phase 1 (staging): crew cluster at the apparatus station.
  // Phase 2 (traveling): staggered convoy along the red route.
  // Phase 3 (dispersing): each crew flies from route-end to their assigned
  //   scene position (ease-in-out over ~3.5s).
  // Phase 4 (on-scene): crew drift gently at their position based on task.
  useEffect(() => {
    if (!ok || !mRef.current || !incidentCoords) return;
    const m = mRef.current;
    const existing = crewMarkersRef.current;
    const livePlan = new Map(crewPlan.map((c) => [c.badge, c]));
    const routeCoords = (routeGeoJSON?.coordinates ?? null) as [number, number][] | null;

    // Start the journey clock on first render for this map instance
    if (!journeyStartRef.current) journeyStartRef.current = Date.now();

    // Remove markers for crew no longer on roster
    existing.forEach((rec, badge) => {
      if (!livePlan.has(badge)) { rec.mk.remove(); existing.delete(badge); }
    });

    function renderCrewEl(color: string, initial: string, captain: boolean, phase: CrewPhase): string {
      const size = captain ? 26 : 22;
      const dotSize = size * 0.68;
      const label = captain ? "★" : initial;
      // Phase-specific glow: traveling uses a blue tint, on-scene uses task color
      const accent = phase === "traveling" ? "#60a5fa" : phase === "dispersing" ? "#fbbf24" : color;
      const pulse = phase === "traveling" || phase === "dispersing";
      return `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">
        ${pulse ? `<div style="position:absolute;inset:-3px;border-radius:50%;border:1.5px solid ${accent}80;animation:beacon-pulse 1.3s infinite;--c:${accent}60"></div>` : ""}
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:conic-gradient(from 180deg, ${accent} 0deg, ${accent}cc 120deg, ${accent}99 240deg, ${accent} 360deg);display:flex;align-items:center;justify-content:center;padding:2px;box-shadow:0 0 12px ${accent}80,0 1px 4px rgba(0,0,0,0.5)">
          <div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:radial-gradient(circle,${captain ? "#fef3c7" : "#f4f4f5"} 0%,${captain ? "#eab308" : "#a1a1aa"} 100%);display:flex;align-items:center;justify-content:center;font-size:${captain ? 12 : 10}px;font-weight:800;color:#0a0a0e;line-height:1">${label}</div>
        </div>
        <div style="position:absolute;bottom:-1px;right:-1px;width:7px;height:7px;border-radius:50%;background:${phase === "on_scene" ? "#22c55e" : phase === "traveling" ? "#60a5fa" : "#eab308"};border:1.5px solid #0a0a0e;box-shadow:0 0 4px currentColor"></div>
      </div>`;
    }

    // Add or update markers with their initial position
    crewPlan.forEach((c) => {
      const rec = existing.get(c.badge);
      const idx = crewPlan.findIndex((x) => x.badge === c.badge);
      const jp = crewJourneyPosition(
        Date.now(), journeyStartRef.current, idx,
        routeCoords, incidentCoords[0], incidentCoords[1], c.hint, c.badge
      );
      if (!rec) {
        const el = document.createElement("div");
        el.style.cssText = "cursor:pointer";
        el.innerHTML = renderCrewEl(c.color, c.name.split(" ")[0][0], c.captain, jp.phase);
        el.title = `${c.name}${c.task ? " · " + c.task.replace(/_/g, " ") : " · unassigned"}`;
        const mk = new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat(jp.pos).addTo(m);
        existing.set(c.badge, { mk, el, hint: c.hint });
      } else {
        rec.hint = c.hint;
        rec.el.innerHTML = renderCrewEl(c.color, c.name.split(" ")[0][0], c.captain, jp.phase);
        rec.el.title = `${c.name}${c.task ? " · " + c.task.replace(/_/g, " ") : " · unassigned"}`;
        rec.mk.setLngLat(jp.pos);
      }
    });

    // Animation loop — runs at 10fps, drives both journey + on-scene drift
    cancelAnimationFrame(crewRafRef.current);
    let last = 0;
    let lastPhase = new Map<string, CrewPhase>();
    const tick = (now: number) => {
      if (now - last > 100) {
        last = now;
        existing.forEach((rec, badge) => {
          const idx = crewPlan.findIndex((x) => x.badge === badge);
          const plan = crewPlan[idx];
          if (!plan) return;
          const jp = crewJourneyPosition(
            Date.now(), journeyStartRef.current, idx,
            routeCoords, incidentCoords[0], incidentCoords[1], rec.hint, badge
          );
          rec.mk.setLngLat(jp.pos);
          // Only re-render DOM when phase changes (performance)
          if (lastPhase.get(badge) !== jp.phase) {
            rec.el.innerHTML = renderCrewEl(plan.color, plan.name.split(" ")[0][0], plan.captain, jp.phase);
            lastPhase.set(badge, jp.phase);
          }
        });
      }
      crewRafRef.current = requestAnimationFrame(tick);
    };
    crewRafRef.current = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(crewRafRef.current); };
  }, [ok, incidentCoords, crewPlan, routeGeoJSON]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", minHeight: 360 }}>
      <div ref={cRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <MapResetButton onReset={() => mRef.current?.flyTo({ ...DEFAULT_VIEW, duration: 700 })} />


      {/* Weather HUD (top-left) */}
      <div className="absolute top-3 left-3 glass rounded-lg px-2.5 py-1.5 text-[10px] flex items-center gap-2" style={{ color: "#e4e4e7" }}>
        <span className="font-semibold">{weather.temp_c}°C</span>
        <span style={{ color: "#71717a" }}>·</span>
        <span>Wind <span className="tabular-nums">{weather.wind_kph}</span> km/h @ {weather.wind_deg}°</span>
        <span style={{ color: "#71717a" }}>·</span>
        <span>RH {weather.rh}%</span>
        <span className="ml-1 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
          style={{
            background: weather.fire_weather_index === "extreme" ? "rgba(239,68,68,0.2)" : weather.fire_weather_index === "high" ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.05)",
            color: weather.fire_weather_index === "extreme" ? "#ef4444" : weather.fire_weather_index === "high" ? "#f97316" : "#a1a1aa",
          }}
        >
          FWI {weather.fire_weather_index}
        </span>
      </div>

      {/* Severity badge top-right */}
      <div className="absolute top-3 right-12 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider"
        style={{ background: `${SEV_COLOR[severity] ?? "#71717a"}20`, color: SEV_COLOR[severity] ?? "#a1a1aa", border: `1px solid ${SEV_COLOR[severity] ?? "#71717a"}40` }}>
        {severity}
      </div>

    </div>
  );
}

