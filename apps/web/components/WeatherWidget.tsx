"use client";

import { useQuery } from "@tanstack/react-query";
import { Wind, Droplets, Thermometer, AlertTriangle } from "lucide-react";

interface WeatherData {
  temperature_f: number;
  humidity_pct: number;
  wind_speed_mph: number;
  wind_direction_deg: number;
  condition: string;
  fire_risk: "low" | "moderate" | "high";
}

const RISK_STYLES = {
  low: "text-[#3ddc84] bg-[#3ddc84]/10",
  moderate: "text-[#ffc93c] bg-[#ffc93c]/10",
  high: "text-[#ff2d2d] bg-[#ff2d2d]/10",
};

const WIND_ARROWS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function windDir(deg: number): string {
  return WIND_ARROWS[Math.round(deg / 45) % 8];
}

export default function WeatherWidget() {
  const { data } = useQuery<WeatherData>({
    queryKey: ["weather"],
    queryFn: async () => {
      const res = await fetch("/api/weather");
      return (await res.json()).data;
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 min
  });

  if (!data) return null;

  return (
    <div className="absolute top-3 left-3 z-10 rounded-lg bg-[#121214]/90 backdrop-blur-sm border border-[#1a1a1e] px-3 py-2 space-y-1">
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-[#ccc]">
          <Thermometer size={12} />
          {Math.round(data.temperature_f)}°F
        </span>
        <span className="flex items-center gap-1 text-[#888]">
          <Droplets size={12} />
          {data.humidity_pct}%
        </span>
        <span className="flex items-center gap-1 text-[#888]">
          <Wind size={12} />
          {data.wind_speed_mph}mph {windDir(data.wind_direction_deg)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-[#555]">{data.condition}</span>
        <span className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${RISK_STYLES[data.fire_risk]}`}>
          {data.fire_risk === "high" && <AlertTriangle size={10} />}
          Fire risk: {data.fire_risk}
        </span>
      </div>
    </div>
  );
}
