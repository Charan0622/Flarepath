"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { displayNameFor } from "@/lib/crew-data";
import MapResetButton from "@/components/MapResetButton";
import StationDetailPopover from "@/components/StationDetailPopover";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const DEFAULT_VIEW = { center: [-121.8863, 37.3382] as [number, number], zoom: 12.5, pitch: 50, bearing: -15 };

const SEV: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
const STAT: Record<string, string> = { assigned: "#f97316", acknowledged: "#f97316", en_route: "#eab308", on_scene: "#22c55e" };

const STATIONS = [
  { name: "S1", coords: [-121.8900, 37.3394] as [number, number] },
  { name: "S7", coords: [-121.9148, 37.3295] as [number, number] },
  { name: "S30", coords: [-121.8350, 37.3660] as [number, number] },
];

const IC: Record<string, [number, number]> = {
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

interface Incident { id: string; type: string; severity: string; address: string; status: string }
interface Dispatch {
  id: string; incident_id: string; status: string;
  route_geojson: GeoJSON.LineString | null; eta_seconds: number | null;
  assigned_at?: string; en_route_at?: string;
  vehicle: { call_sign: string } | null;
}

interface Props {
  onIncidentClick?: (id: string) => void;
  onVehicleClick?: (dispatchId: string) => void;
  incidents?: Incident[];
  activeDispatches?: Dispatch[];
  selectedIncidentId?: string | null;
  selectedDispatchId?: string | null;
}

function bearingOf(from: number[], to: number[]): number {
  // Compass bearing: 0° = north, 90° = east. Small-angle approximation is fine
  // for intra-city San Jose scales.
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

function lerp(coords: number[][], t: number): { pos: [number, number]; bearing: number } {
  const last = coords.length - 1;
  const c = Math.max(0, Math.min(1, t));
  if (c <= 0) return { pos: coords[0] as [number, number], bearing: bearingOf(coords[0], coords[1] ?? coords[0]) };
  if (c >= 1) {
    const tail = coords[last - 1] ?? coords[last];
    return { pos: coords[last] as [number, number], bearing: bearingOf(tail, coords[last]) };
  }
  let total = 0;
  const segs: number[] = [];
  for (let i = 1; i < coords.length; i++) {
    const d = Math.hypot(coords[i][0] - coords[i-1][0], coords[i][1] - coords[i-1][1]);
    segs.push(d); total += d;
  }
  let tgt = total * c;
  for (let i = 0; i < segs.length; i++) {
    if (tgt <= segs[i]) {
      const s = tgt / segs[i];
      const pos: [number, number] = [
        coords[i][0] + (coords[i+1][0] - coords[i][0]) * s,
        coords[i][1] + (coords[i+1][1] - coords[i][1]) * s,
      ];
      return { pos, bearing: bearingOf(coords[i], coords[i+1]) };
    }
    tgt -= segs[i];
  }
  const tail = coords[last - 1] ?? coords[last];
  return { pos: coords[last] as [number, number], bearing: bearingOf(tail, coords[last]) };
}

export default function LiveMap({ onIncidentClick, onVehicleClick, incidents, activeDispatches, selectedIncidentId, selectedDispatchId }: Props) {
  const cRef = useRef<HTMLDivElement>(null);
  const mRef = useRef<mapboxgl.Map | null>(null);
  const iMk = useRef<mapboxgl.Marker[]>([]);
  const vD = useRef<Map<string, { mk: mapboxgl.Marker; co: number[][]; st: number; eta: number; s: string; arrow: HTMLElement; done: boolean; sel: boolean }>>(new Map());
  const rL = useRef<string[]>([]);
  const af = useRef<number>(0);
  const dashRafRef = useRef<number>(0);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [stationPopup, setStationPopup] = useState<string | null>(null);

  useEffect(() => {
    if (!cRef.current || mRef.current) return;
    if (!mapboxgl.accessToken) {
      setErr("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
      return;
    }
    const m = new mapboxgl.Map({
      container: cRef.current, style: "mapbox://styles/mapbox/dark-v11",
      ...DEFAULT_VIEW, antialias: true,
    });
    m.addControl(new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: true }), "bottom-right");
    m.on("error", (e) => {
      console.error("[LiveMap]", e?.error?.message || e);
      if (e?.error?.message?.toLowerCase().includes("token")) setErr("Invalid Mapbox token");
    });
    m.on("load", () => {
      const layers = m.getStyle().layers;
      const lbl = layers?.find((l) => l.type === "symbol" && (l.layout as Record<string, unknown>)?.["text-field"]);
      if (lbl) {
        m.addLayer({
          id: "3d-buildings", source: "composite", "source-layer": "building",
          filter: ["==", "extrude", "true"], type: "fill-extrusion", minzoom: 12,
          paint: { "fill-extrusion-color": "#0c0c14", "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"], "fill-extrusion-opacity": 0.35 },
        }, lbl.id);
      }
      m.resize();
      setOk(true);
    });
    mRef.current = m;

    const ro = new ResizeObserver(() => m.resize());
    ro.observe(cRef.current);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(af.current);
      cancelAnimationFrame(dashRafRef.current);
      m.remove();
      mRef.current = null;
    };
  }, []);

  // Stations — clearly a "fire station": shield building, blue theme, FS- prefix, label below.
  // Click opens a detail popover with chief + crew + housed apparatus.
  useEffect(() => {
    if (!ok || !mRef.current) return;
    const markers: mapboxgl.Marker[] = [];
    STATIONS.forEach((s) => {
      const stationKey = `SJFD Station ${s.name.replace("S", "")}`;
      const el = document.createElement("div");
      el.style.cssText = "cursor:pointer;pointer-events:auto";
      el.title = `${stationKey} — click for details`;
      el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;transition:transform 160ms ease">
        <div style="position:relative;width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#1e3a8a,#1e40af);border:1.5px solid #60a5fa;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(59,130,246,0.35),inset 0 1px 0 rgba(255,255,255,0.15)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dbeafe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><rect x="9" y="9" width="2" height="2"/><rect x="9" y="13" width="2" height="2"/><rect x="9" y="17" width="2" height="2"/></svg>
          <div style="position:absolute;inset:-2px;border-radius:12px;border:1px solid rgba(96,165,250,0.3);pointer-events:none"></div>
        </div>
        <div style="padding:2px 6px;border-radius:4px;background:rgba(8,8,14,0.9);border:1px solid rgba(96,165,250,0.25);font-size:8px;font-weight:700;color:#93c5fd;letter-spacing:0.8px;white-space:nowrap;backdrop-filter:blur(6px)">FS-${s.name.replace("S", "").padStart(2, "0")}</div>
      </div>`;
      const inner = el.firstElementChild as HTMLElement | null;
      el.addEventListener("mouseenter", () => { if (inner) inner.style.transform = "scale(1.08)"; });
      el.addEventListener("mouseleave", () => { if (inner) inner.style.transform = "scale(1)"; });
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setStationPopup(stationKey);
      });
      markers.push(new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat(s.coords).addTo(mRef.current!));
    });
    return () => { markers.forEach((m) => m.remove()); };
  }, [ok]);

  // Incident beacons — fire emblem with severity halo, label shown for selected/critical
  useEffect(() => {
    if (!ok || !mRef.current || !incidents) return;
    iMk.current.forEach((m) => m.remove());
    iMk.current = [];
    incidents.filter((i) => !["resolved", "cancelled"].includes(i.status)).forEach((inc) => {
      const co = IC[inc.address]; if (!co) return;
      const color = SEV[inc.severity] ?? "#888";
      const sel = inc.id === selectedIncidentId;
      const crit = inc.severity === "critical";
      const size = sel ? 40 : crit ? 34 : 28;
      const ringSize = size + 14;
      const typeLabel = inc.type.replace(/_/g, " ").toUpperCase();
      const el = document.createElement("div");
      el.style.cssText = "cursor:pointer;pointer-events:auto";
      el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
        ${sel || crit ? `<div style="padding:2px 7px;border-radius:4px;background:rgba(8,8,14,0.92);border:1px solid ${color}60;font-size:8px;font-weight:800;color:${color};letter-spacing:1px;white-space:nowrap;box-shadow:0 2px 8px ${color}30">${typeLabel}</div>` : ""}
        <div style="position:relative;width:${size}px;height:${size}px">
          <div style="position:absolute;inset:${(size - ringSize) / 2}px;border-radius:50%;border:1.5px solid ${color}30;animation:beacon-pulse 2s ease-in-out infinite;--c:${color}30"></div>
          ${crit ? `<div style="position:absolute;inset:${(size - ringSize - 10) / 2}px;border-radius:50%;border:1px solid ${color}20;animation:beacon-pulse 2.8s ease-in-out infinite;--c:${color}15"></div>` : ""}
          <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,${color} 0%,${color}dd 60%,${color}80 100%);border:${sel ? '2.5px solid #fff' : `2px solid ${color}`};box-shadow:0 0 ${sel ? 32 : 18}px ${color}aa,inset 0 1px 4px rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center">
            <svg width="${size * 0.55}" height="${size * 0.55}" viewBox="0 0 24 24" fill="#fff" stroke="#fff" stroke-width="0.5"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>
          </div>
        </div>
        <div style="width:2px;height:${sel ? 38 : 22}px;background:linear-gradient(to bottom,${color},transparent);border-radius:1px"></div>
      </div>`;
      el.addEventListener("click", () => onIncidentClick?.(inc.id));
      iMk.current.push(new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat(co).addTo(mRef.current!));
    });
  }, [ok, incidents, selectedIncidentId, onIncidentClick]);

  // Routes for selected — layered glow + solid base + animated flowing dashes (direction of travel)
  useEffect(() => {
    if (!ok || !mRef.current) return;
    const m = mRef.current;
    rL.current.forEach((id) => { if (m.getLayer(id)) m.removeLayer(id); });
    const srcs = new Set(rL.current.map((id) => id.replace(/-\w+$/, "")));
    srcs.forEach((s) => { try { if (m.getSource(s)) m.removeSource(s); } catch {} });
    rL.current = [];
    if (dashRafRef.current) cancelAnimationFrame(dashRafRef.current);
    if (!selectedIncidentId || !activeDispatches) return;
    const sel = activeDispatches.filter((d) => d.incident_id === selectedIncidentId && d.route_geojson);
    if (!sel.length) return;
    const flowIds: string[] = [];
    sel.forEach((d, i) => {
      const src = `r${i}`;
      m.addSource(src, { type: "geojson", data: { type: "Feature", properties: {}, geometry: d.route_geojson! } });
      const g = `${src}-g`, b = `${src}-b`, f = `${src}-f`;
      // Outer glow
      m.addLayer({ id: g, type: "line", source: src, paint: { "line-color": "#ef4444", "line-width": 14, "line-blur": 10, "line-opacity": 0.22 }, layout: { "line-cap": "round", "line-join": "round" } });
      // Solid base
      m.addLayer({ id: b, type: "line", source: src, paint: { "line-color": "#ef4444", "line-width": 3.5, "line-opacity": 0.55 }, layout: { "line-cap": "round", "line-join": "round" } });
      // Flowing bright dashes (animated via dasharray cycle)
      m.addLayer({ id: f, type: "line", source: src, paint: { "line-color": "#fff5f0", "line-width": 2, "line-opacity": 0.95, "line-dasharray": [0, 4, 3] }, layout: { "line-cap": "round", "line-join": "round" } });
      rL.current.push(g, b, f);
      flowIds.push(f);
    });
    // Animated flow — cycle dash arrays to create forward motion toward the incident
    const dashSteps = [
      [0, 4, 3],
      [0.5, 4, 2.5],
      [1, 4, 2],
      [1.5, 4, 1.5],
      [2, 4, 1],
      [2.5, 4, 0.5],
      [3, 4, 0],
      [3.5, 3.5, 0],
      [4, 3, 0],
      [0, 0.5, 3, 3.5],
      [0, 1, 3, 3],
      [0, 1.5, 3, 2.5],
      [0, 2, 3, 2],
      [0, 2.5, 3, 1.5],
      [0, 3, 3, 1],
      [0, 3.5, 3, 0.5],
    ];
    let step = 0, last = 0;
    function animateDash(now: number) {
      if (now - last > 60) {
        last = now;
        step = (step + 1) % dashSteps.length;
        flowIds.forEach((id) => {
          try { m.setPaintProperty(id, "line-dasharray", dashSteps[step]); } catch {}
        });
      }
      dashRafRef.current = requestAnimationFrame(animateDash);
    }
    dashRafRef.current = requestAnimationFrame(animateDash);

    const bounds = new mapboxgl.LngLatBounds();
    sel.forEach((d) => d.route_geojson!.coordinates.forEach((c: number[]) => bounds.extend([c[0], c[1]])));
    m.fitBounds(bounds, { padding: { top: 100, bottom: 100, left: 380, right: 440 }, duration: 800, pitch: 50 });
  }, [ok, selectedIncidentId, activeDispatches]);

  // Vehicle — directional chevron marker. Single-trip motion paced to the dispatch's
  // real eta_seconds, then freezes at the destination.
  useEffect(() => {
    if (!ok || !mRef.current || !activeDispatches) return;
    const existing = vD.current;
    const ids = new Set<string>();

    const buildEl = (label: string, status: string, color: string, dispatchId: string, selected: boolean) => {
      const arrived = status === "on_scene";
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;pointer-events:auto";
      wrap.title = `${label} · Click for unit details`;

      const tag = document.createElement("div");
      tag.textContent = label;
      const tagBg = selected ? "#fff" : "rgba(8,8,14,0.92)";
      const tagFg = selected ? "#0b0b0f" : color;
      const tagBorder = selected ? "#fff" : `${color}a0`;
      tag.style.cssText = `padding:2px 7px;border-radius:4px;background:${tagBg};border:1px solid ${tagBorder};font-size:9px;font-weight:800;color:${tagFg};letter-spacing:0.6px;box-shadow:0 2px 8px ${color}40;white-space:nowrap`;
      wrap.appendChild(tag);

      const ringSize = selected ? 34 : 28;
      const ring = document.createElement("div");
      ring.style.cssText = `position:relative;width:${ringSize}px;height:${ringSize}px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:radial-gradient(circle,${color}${selected ? "40" : "25"},transparent 70%);border:${selected ? 2 : 1.5}px solid ${selected ? "#fff" : color};box-shadow:0 0 ${selected ? 22 : 14}px ${color}${selected ? "90" : "60"},inset 0 0 8px ${color}30;transition:all 180ms ease`;

      const arrow = document.createElement("div");
      const arrowSize = selected ? 20 : 18;
      arrow.style.cssText = `width:${arrowSize}px;height:${arrowSize}px;display:flex;align-items:center;justify-content:center;transform:rotate(0deg);transition:transform 180ms linear;transform-origin:50% 50%`;
      arrow.innerHTML = arrived
        ? `<svg width="${arrowSize - 4}" height="${arrowSize - 4}" viewBox="0 0 24 24" fill="${color}"><path d="M12 2 L20 20 L12 15 L4 20 Z" opacity="0.85"/></svg>`
        : `<svg width="${arrowSize - 2}" height="${arrowSize - 2}" viewBox="0 0 24 24" fill="${color}" stroke="${selected ? "#fff" : color}" stroke-width="1" stroke-linejoin="round"><path d="M12 3 L20 21 L12 17 L4 21 Z"/></svg>`;
      ring.appendChild(arrow);
      wrap.appendChild(ring);

      wrap.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onVehicleClick?.(dispatchId);
      });

      return { el: wrap, arrow };
    };

    activeDispatches.forEach((d) => {
      if (!d.vehicle || !d.route_geojson) return;
      ids.add(d.id);
      const co = d.route_geojson.coordinates;
      const color = STAT[d.status] ?? "#666";
      // Prefer Indian-tradition display name ("Agni", "Vayu"); fall back to
      // a compact SJFD abbreviation for any unit not in the roster.
      const displayed = displayNameFor(d.vehicle.call_sign);
      const label = displayed && displayed !== d.vehicle.call_sign
        ? displayed
        : d.vehicle.call_sign.replace("Engine ", "E").replace("Ladder ", "L").replace("Tanker ", "T").replace("Rescue ", "R");
      const etaMs = Math.max(10_000, (d.eta_seconds ?? 600) * 1000);

      const isSel = d.id === selectedDispatchId;
      if (!existing.has(d.id)) {
        const built = buildEl(label, d.status, color, d.id, isSel);
        const mk = new mapboxgl.Marker({ element: built.el, anchor: "bottom" })
          .setLngLat(co[0] as [number, number])
          .addTo(mRef.current!);
        existing.set(d.id, {
          mk, co, st: Date.now(), eta: etaMs, s: d.status,
          arrow: built.arrow, done: d.status === "on_scene",
          sel: isSel,
        });
      } else {
        const e = existing.get(d.id)!;
        e.co = co;
        e.eta = etaMs;
        if (e.s !== d.status || e.sel !== isSel) {
          const pos = e.mk.getLngLat();
          e.mk.remove();
          const built = buildEl(label, d.status, color, d.id, isSel);
          e.mk = new mapboxgl.Marker({ element: built.el, anchor: "bottom" }).setLngLat(pos).addTo(mRef.current!);
          e.arrow = built.arrow;
          e.s = d.status;
          e.sel = isSel;
          if (d.status === "on_scene") e.done = true;
        }
      }
    });
    existing.forEach((e, id) => { if (!ids.has(id)) { e.mk.remove(); existing.delete(id); } });

    cancelAnimationFrame(af.current);
    let last = 0;
    function tick(now: number) {
      if (now - last > 80) {
        last = now;
        existing.forEach((e) => {
          if (e.done) return;
          const elapsed = Date.now() - e.st;
          const progress = Math.min(elapsed / e.eta, 1);
          const { pos, bearing } = lerp(e.co, progress);
          e.mk.setLngLat(pos);
          e.arrow.style.transform = `rotate(${bearing}deg)`;
          if (progress >= 1) {
            e.done = true;
          }
        });
      }
      af.current = requestAnimationFrame(tick);
    }
    af.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(af.current);
  }, [ok, activeDispatches, selectedDispatchId, onVehicleClick]);

  return (
    <>
      <div ref={cRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />
      <MapResetButton
        onReset={() => mRef.current?.flyTo({ ...DEFAULT_VIEW, duration: 800 })}
        title="Reset camera to downtown San Jose"
      />
      {err && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3 py-2 rounded-md text-[11px]"
          style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444" }}>
          Map error: {err}
        </div>
      )}
      <StationDetailPopover stationName={stationPopup} onClose={() => setStationPopup(null)} />
    </>
  );
}
