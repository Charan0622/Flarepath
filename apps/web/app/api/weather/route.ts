import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api-response";

// GET /api/weather — weather conditions for San Jose (uses free Open-Meteo API)
export async function GET(_request: NextRequest) {
  const lat = 37.3382;
  const lng = -121.8863;

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Los_Angeles`,
      { next: { revalidate: 300 } } // Cache for 5 min
    );

    const data = await res.json();
    const current = data.current;

    const WEATHER_CODES: Record<number, string> = {
      0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Foggy", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle",
      55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
      71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
      80: "Slight showers", 81: "Moderate showers", 82: "Violent showers",
      95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ heavy hail",
    };

    return apiSuccess({
      temperature_f: current.temperature_2m,
      humidity_pct: current.relative_humidity_2m,
      wind_speed_mph: current.wind_speed_10m,
      wind_direction_deg: current.wind_direction_10m,
      condition: WEATHER_CODES[current.weather_code] ?? "Unknown",
      fire_risk: current.relative_humidity_2m < 30 && current.wind_speed_10m > 15 ? "high" : current.relative_humidity_2m < 50 ? "moderate" : "low",
    });
  } catch {
    return apiSuccess({
      temperature_f: 72,
      humidity_pct: 55,
      wind_speed_mph: 8,
      wind_direction_deg: 270,
      condition: "Partly cloudy",
      fire_risk: "low",
    });
  }
}
