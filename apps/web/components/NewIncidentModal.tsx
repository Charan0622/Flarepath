"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import VoiceRecorder from "./VoiceRecorder";

const formSchema = z.object({
  reporter_name: z.string().min(1, "Reporter name is required"),
  reporter_phone: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  latitude: z.number(),
  longitude: z.number(),
  type: z.enum(["structure_fire", "vehicle_fire", "wildfire", "medical", "hazmat", "rescue", "false_alarm", "other"]),
  description: z.string().min(1, "Description is required"),
  hazards: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

const INCIDENT_TYPES = [
  { value: "structure_fire", label: "Structure Fire" },
  { value: "vehicle_fire", label: "Vehicle Fire" },
  { value: "wildfire", label: "Wildfire" },
  { value: "medical", label: "Medical" },
  { value: "hazmat", label: "Hazmat" },
  { value: "rescue", label: "Rescue" },
  { value: "false_alarm", label: "False Alarm" },
  { value: "other", label: "Other" },
];

const HAZARD_OPTIONS = [
  "trapped_occupants", "high_rise", "fuel_leak", "gas_leak", "electrical",
  "chemical_fumes", "structural_collapse", "mass_casualty", "traffic_hazard",
  "wind_driven", "child_involved", "power_lines",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

interface GeoResult {
  place_name: string;
  center: [number, number];
}

export default function NewIncidentModal({ isOpen, onClose, onCreated }: Props) {
  const [addressSuggestions, setAddressSuggestions] = useState<GeoResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [triaging, setTriaging] = useState(false);
  const queryClient = useQueryClient();

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "structure_fire",
      hazards: [],
      latitude: 0,
      longitude: 0,
    },
  });

  const selectedHazards = watch("hazards");

  async function searchAddress(query: string) {
    if (query.length < 3) { setAddressSuggestions([]); return; }
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&proximity=-121.8863,37.3382&limit=5`
    );
    const data = await res.json();
    setAddressSuggestions(data.features ?? []);
  }

  function selectAddress(result: GeoResult) {
    setValue("address", result.place_name);
    setValue("longitude", result.center[0]);
    setValue("latitude", result.center[1]);
    setAddressSuggestions([]);
  }

  function toggleHazard(hazard: string) {
    const current = selectedHazards ?? [];
    if (current.includes(hazard)) {
      setValue("hazards", current.filter((h) => h !== hazard));
    } else {
      setValue("hazards", [...current, hazard]);
    }
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);

    // Create incident
    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();

    if (json.error) {
      setSubmitting(false);
      alert(json.error);
      return;
    }

    const incidentId = json.data.id;

    // Trigger AI triage
    setTriaging(true);
    await fetch("/api/ai/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incident_id: incidentId }),
    });

    setSubmitting(false);
    setTriaging(false);
    queryClient.invalidateQueries({ queryKey: ["incidents"] });
    reset();
    onCreated(incidentId);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-xl border border-[#1a1a1e] bg-[#0a0a0b] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1a1a1e] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">New Incident</h2>
          <button onClick={onClose} className="rounded p-1 text-[#888] hover:bg-[#1a1a1e]">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="max-h-[70vh] overflow-auto p-6 space-y-4">
          {/* Voice Dictation */}
          <VoiceRecorder
            onTranscript={({ extracted }) => {
              if (extracted) {
                if (extracted.reporter_name) setValue("reporter_name", extracted.reporter_name);
                if (extracted.reporter_phone) setValue("reporter_phone", extracted.reporter_phone);
                if (extracted.address) setValue("address", extracted.address);
                if (extracted.type) setValue("type", extracted.type as FormData["type"]);
                if (extracted.description) setValue("description", extracted.description);
                if (extracted.hazards?.length) setValue("hazards", extracted.hazards);
              }
            }}
          />

          {/* Reporter */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1">Reporter Name</label>
              <input {...register("reporter_name")} className="w-full rounded-md border border-[#333] bg-[#121214] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#ff2d2d] focus:outline-none" placeholder="John Smith" />
              {errors.reporter_name && <p className="mt-1 text-xs text-[#ff2d2d]">{errors.reporter_name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1">Phone</label>
              <input {...register("reporter_phone")} className="w-full rounded-md border border-[#333] bg-[#121214] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#ff2d2d] focus:outline-none" placeholder="+1 408-555-0000" />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1">Incident Type</label>
            <select {...register("type")} className="w-full rounded-md border border-[#333] bg-[#121214] px-3 py-2 text-sm text-white focus:border-[#ff2d2d] focus:outline-none">
              {INCIDENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Address with autocomplete */}
          <div className="relative">
            <label className="block text-xs font-medium text-[#888] mb-1">Address</label>
            <input
              {...register("address")}
              onChange={(e) => { register("address").onChange(e); searchAddress(e.target.value); }}
              className="w-full rounded-md border border-[#333] bg-[#121214] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#ff2d2d] focus:outline-none"
              placeholder="Start typing an address..."
              autoComplete="off"
            />
            {errors.address && <p className="mt-1 text-xs text-[#ff2d2d]">{errors.address.message}</p>}
            {addressSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-auto rounded-md border border-[#333] bg-[#121214]">
                {addressSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectAddress(s)}
                    className="block w-full px-3 py-2 text-left text-xs text-[#ccc] hover:bg-[#1a1a1e]"
                  >
                    {s.place_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1">Description</label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full rounded-md border border-[#333] bg-[#121214] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#ff2d2d] focus:outline-none resize-none"
              placeholder="Describe the emergency situation..."
            />
            {errors.description && <p className="mt-1 text-xs text-[#ff2d2d]">{errors.description.message}</p>}
          </div>

          {/* Hazards */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1">Hazards</label>
            <div className="flex flex-wrap gap-1.5">
              {HAZARD_OPTIONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => toggleHazard(h)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                    selectedHazards?.includes(h)
                      ? "bg-[#ff2d2d]/20 text-[#ff2d2d] border border-[#ff2d2d]/30"
                      : "bg-[#1a1a1e] text-[#888] border border-transparent hover:text-[#ccc]"
                  }`}
                >
                  {h.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-[#ff2d2d] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e02525] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {triaging ? "Running AI Triage..." : "Creating..."}
              </>
            ) : (
              "Create Incident & Run AI Triage"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
