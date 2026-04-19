"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Volume2, VolumeX, X, Navigation } from "lucide-react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface Step {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: { type: string; modifier?: string; location: [number, number] };
}

export default function NavigationPage() {
  const params = useParams();
  const dispatchId = params.dispatchId as string;
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const spokenStepsRef = useRef<Set<number>>(new Set());

  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [started, setStarted] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.LineString | null>(null);

  // Speak instruction
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.volume = 1.0;
    speechSynthesis.speak(u);
  }, [voiceEnabled]);

  // Fetch dispatch and route
  useEffect(() => {
    async function loadRoute() {
      const res = await fetch(`/api/incidents`);
      const json = await res.json();
      const incidents = json.data?.incidents ?? [];

      // Find dispatch from any incident
      for (const inc of incidents) {
        const detailRes = await fetch(`/api/incidents/${inc.id}`);
        const detail = await detailRes.json();
        const dispatch = detail.data?.dispatches?.find((d: Record<string, unknown>) => d.id === dispatchId);
        if (dispatch?.route_geojson) {
          setRouteGeometry(dispatch.route_geojson);

          // Re-fetch route with steps
          const coords = dispatch.route_geojson.coordinates;
          if (coords?.length >= 2) {
            const start = coords[0];
            const end = coords[coords.length - 1];
            const routeRes = await fetch(
              `/api/route/optimize?origin_lng=${start[0]}&origin_lat=${start[1]}&dest_lng=${end[0]}&dest_lat=${end[1]}`
            );
            const routeJson = await routeRes.json();
            setSteps(routeJson.data?.steps ?? []);
          }
          return;
        }
      }
    }
    loadRoute();
  }, [dispatchId]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/navigation-night-v1",
      center: [-121.8863, 37.3382],
      zoom: 17,
      pitch: 60,
      bearing: 0,
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Render route on map
  useEffect(() => {
    if (!mapRef.current || !routeGeometry) return;
    const map = mapRef.current;

    const addRoute = () => {
      if (map.getSource("nav-route")) return;

      map.addSource("nav-route", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: routeGeometry },
      });

      map.addLayer({
        id: "nav-route-glow",
        type: "line",
        source: "nav-route",
        paint: { "line-color": "#ff2d2d", "line-width": 14, "line-blur": 10, "line-opacity": 0.4 },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      map.addLayer({
        id: "nav-route-line",
        type: "line",
        source: "nav-route",
        paint: { "line-color": "#ff2d2d", "line-width": 8, "line-opacity": 0.95 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
    };

    if (map.isStyleLoaded()) addRoute();
    else map.on("load", addRoute);
  }, [routeGeometry]);

  // Start navigation — GPS + Wake Lock
  async function startNavigation() {
    setStarted(true);
    speak("Starting navigation. Follow the red path.");

    // Wake lock
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {}

    // GPS tracking
    if ("geolocation" in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, heading } = pos.coords;
          const map = mapRef.current;
          if (!map) return;

          // Move camera to follow user
          map.easeTo({
            center: [longitude, latitude],
            zoom: 17,
            pitch: 60,
            bearing: heading ?? map.getBearing(),
            duration: 1000,
          });

          // Find nearest step
          updateCurrentStep(latitude, longitude);

          // Send ping to server
          sendPing(latitude, longitude, pos.coords.speed, heading);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
    }
  }

  function updateCurrentStep(lat: number, lng: number) {
    if (steps.length === 0) return;

    let closest = 0;
    let minDist = Infinity;

    for (let i = currentStepIdx; i < steps.length; i++) {
      const maneuver = steps[i].maneuver.location;
      const d = haversine(lat, lng, maneuver[1], maneuver[0]);
      if (d < minDist) {
        minDist = d;
        closest = i;
      }
    }

    setCurrentStepIdx(closest);

    // Speak instructions at 250m and 50m
    const distToNext = minDist * 1000; // meters
    if (distToNext < 250 && !spokenStepsRef.current.has(closest * 10 + 1)) {
      speak(`In ${Math.round(distToNext)} meters, ${steps[closest].instruction}`);
      spokenStepsRef.current.add(closest * 10 + 1);
    }
    if (distToNext < 50 && !spokenStepsRef.current.has(closest * 10 + 2)) {
      speak(steps[closest].instruction);
      spokenStepsRef.current.add(closest * 10 + 2);
    }
  }

  async function sendPing(lat: number, lng: number, speed: number | null, heading: number | null) {
    await fetch("/api/location/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dispatch_id: dispatchId,
        latitude: lat,
        longitude: lng,
        speed_kmh: speed ? speed * 3.6 : null,
        heading,
      }),
    }).catch(() => {});
  }

  function stopNavigation() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    wakeLockRef.current?.release();
    speechSynthesis.cancel();
    setStarted(false);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      wakeLockRef.current?.release();
      speechSynthesis?.cancel();
    };
  }, []);

  const currentStep = steps[currentStepIdx];

  return (
    <div className="relative h-screen w-screen">
      {/* Full-screen map */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Top banner — current instruction */}
      {started && currentStep && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-[#0a0a0b]/90 backdrop-blur-sm px-4 py-3 safe-area-top">
          <p className="text-base font-semibold text-white">{currentStep.instruction}</p>
          <p className="text-xs text-[#888] mt-0.5">
            {Math.round(currentStep.distance)}m · Step {currentStepIdx + 1}/{steps.length}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-6 left-4 right-4 z-10 space-y-3">
        {!started ? (
          <button
            onClick={startNavigation}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#ff2d2d] py-5 text-lg font-bold text-white shadow-lg"
            style={{ minHeight: "64px" }}
          >
            <Navigation size={24} />
            Start Navigation
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="rounded-xl bg-[#121214]/90 p-4 text-white backdrop-blur-sm"
            >
              {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button
              onClick={stopNavigation}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#121214]/90 py-4 text-sm font-semibold text-white backdrop-blur-sm"
            >
              <X size={16} />
              End Navigation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
