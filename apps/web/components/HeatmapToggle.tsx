"use client";

import { useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Layers } from "lucide-react";

// Sample historical incident density data for San Jose
// In production, this would come from an API endpoint
const HEATMAP_DATA: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { weight: 0.9 }, geometry: { type: "Point", coordinates: [-121.8850, 37.3335] } },
    { type: "Feature", properties: { weight: 0.7 }, geometry: { type: "Point", coordinates: [-121.8890, 37.3340] } },
    { type: "Feature", properties: { weight: 0.8 }, geometry: { type: "Point", coordinates: [-121.8770, 37.3350] } },
    { type: "Feature", properties: { weight: 0.6 }, geometry: { type: "Point", coordinates: [-121.8916, 37.3318] } },
    { type: "Feature", properties: { weight: 0.5 }, geometry: { type: "Point", coordinates: [-121.9070, 37.3430] } },
    { type: "Feature", properties: { weight: 0.9 }, geometry: { type: "Point", coordinates: [-121.9478, 37.3210] } },
    { type: "Feature", properties: { weight: 0.3 }, geometry: { type: "Point", coordinates: [-121.8990, 37.3080] } },
    { type: "Feature", properties: { weight: 0.4 }, geometry: { type: "Point", coordinates: [-121.9452, 37.3246] } },
    { type: "Feature", properties: { weight: 0.7 }, geometry: { type: "Point", coordinates: [-121.8230, 37.3862] } },
    { type: "Feature", properties: { weight: 0.8 }, geometry: { type: "Point", coordinates: [-121.9230, 37.4072] } },
    // Additional density points
    { type: "Feature", properties: { weight: 0.6 }, geometry: { type: "Point", coordinates: [-121.8900, 37.3394] } },
    { type: "Feature", properties: { weight: 0.5 }, geometry: { type: "Point", coordinates: [-121.8800, 37.3400] } },
    { type: "Feature", properties: { weight: 0.4 }, geometry: { type: "Point", coordinates: [-121.8950, 37.3300] } },
    { type: "Feature", properties: { weight: 0.7 }, geometry: { type: "Point", coordinates: [-121.9000, 37.3450] } },
    { type: "Feature", properties: { weight: 0.3 }, geometry: { type: "Point", coordinates: [-121.8700, 37.3500] } },
  ],
};

interface Props {
  map: mapboxgl.Map | null;
}

export default function HeatmapToggle({ map }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!map) return;

    function addHeatmap() {
      if (map!.getSource("heatmap-data")) return;

      map!.addSource("heatmap-data", {
        type: "geojson",
        data: HEATMAP_DATA,
      });

      map!.addLayer({
        id: "heatmap-layer",
        type: "heatmap",
        source: "heatmap-data",
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": 1,
          "heatmap-radius": 40,
          "heatmap-opacity": 0,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "rgba(61,220,132,0.3)",
            0.4, "rgba(255,201,60,0.4)",
            0.6, "rgba(255,123,28,0.5)",
            0.8, "rgba(255,45,45,0.6)",
            1, "rgba(255,45,45,0.8)",
          ],
        },
      });
    }

    if (map.isStyleLoaded()) addHeatmap();
    else map.on("load", addHeatmap);
  }, [map]);

  useEffect(() => {
    if (!map || !map.getLayer("heatmap-layer")) return;
    map.setPaintProperty("heatmap-layer", "heatmap-opacity", visible ? 0.7 : 0);
  }, [map, visible]);

  return (
    <button
      onClick={() => setVisible(!visible)}
      className={`absolute top-16 right-3 z-10 rounded-lg p-2.5 shadow-lg transition-colors ${
        visible
          ? "bg-[#ff2d2d] text-white"
          : "bg-[#121214]/90 text-[#888] hover:text-white backdrop-blur-sm"
      }`}
      title={visible ? "Hide heatmap" : "Show incident heatmap"}
    >
      <Layers size={18} />
    </button>
  );
}
