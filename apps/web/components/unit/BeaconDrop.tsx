"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

interface Props {
  map: mapboxgl.Map | null;
  mapReady: boolean;
  target: [number, number] | null;
  trigger: string | null;           // changes when a new assignment arrives
  color?: string;
}

// Ring-pulse on the map at the target location when a new assignment arrives.
// Standalone effect so any parent can call it with a map instance.
export default function BeaconDrop({ map, mapReady, target, trigger, color = "#ef4444" }: Props) {
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!map || !mapReady || !target || !trigger) return;
    // Mount a DOM marker with a CSS-animated ring-pulse
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="position:relative;width:40px;height:40px">
        <div style="position:absolute;inset:0;border-radius:50%;border:2px solid ${color};animation:beacon-drop-ring 1.5s ease-out 1;pointer-events:none;opacity:0.9"></div>
        <div style="position:absolute;inset:8px;border-radius:50%;border:2px solid ${color};animation:beacon-drop-ring 1.5s ease-out 0.3s 1;pointer-events:none;opacity:0.7"></div>
        <div style="position:absolute;inset:16px;border-radius:50%;background:${color};box-shadow:0 0 12px ${color}">
        </div>
      </div>`;
    const mk = new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat(target).addTo(map);
    markerRef.current = mk;
    setVisible(true);

    // Remove after animation completes
    const tid = setTimeout(() => {
      mk.remove();
      markerRef.current = null;
      setVisible(false);
    }, 2200);
    return () => { clearTimeout(tid); mk.remove(); };
  }, [map, mapReady, target, trigger, color]);

  // No DOM output from component itself — everything lives on the map
  return visible ? null : null;
}
