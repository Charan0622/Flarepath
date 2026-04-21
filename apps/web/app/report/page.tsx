"use client";

import { useState, useEffect } from "react";
import { MapPin, Send, CheckCircle, AlertTriangle } from "lucide-react";

export default function CitizenReportPage() {
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    detectLocation();
  }, []);

  function detectLocation() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        // Reverse geocode
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${pos.coords.longitude},${pos.coords.latitude}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`)
          .then((r) => r.json())
          .then((data) => {
            if (data.features?.[0]) setAddress(data.features[0].place_name);
          });
      },
      () => setLocating(false),
      { enableHighAccuracy: true }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description || !coords) return;
    setSubmitting(true);

    await fetch("/api/citizen-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporter_name: name || undefined,
        reporter_phone: phone || undefined,
        latitude: coords.lat,
        longitude: coords.lng,
        address: address || undefined,
        description,
      }),
    });

    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0b] px-4 text-center">
        <CheckCircle size={48} className="text-[#3ddc84]" />
        <h1 className="mt-4 text-2xl font-bold text-white">Report Submitted</h1>
        <p className="mt-2 text-sm text-[#888]">
          Thank you. San Jose Fire Department has been notified.<br />
          Stay safe and move to a safe location.
        </p>
        <button onClick={() => { setSubmitted(false); setDescription(""); }} className="mt-6 rounded-md bg-[#ff2d2d] px-6 py-2 text-sm font-semibold text-white">
          Submit Another Report
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <span className="text-4xl">🚒</span>
          <h1 className="mt-3 text-2xl font-bold text-white">Report an Emergency</h1>
          <p className="mt-1 text-sm text-[#888]">San Jose Fire Department</p>
        </div>

        <div className="rounded-lg border border-[#ff7b1c]/30 bg-[#ff7b1c]/10 p-3 text-sm text-[#ff7b1c]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <strong>If this is a life-threatening emergency, call 911 first.</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1">What&apos;s happening? *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full rounded-md border border-[#333] bg-[#121214] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#ff2d2d] focus:outline-none resize-none"
              placeholder="Describe the emergency..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#888] mb-1">
              <MapPin size={12} className="inline mr-1" />
              Location
            </label>
            {locating ? (
              <p className="text-xs text-[#555]">Detecting your location...</p>
            ) : coords ? (
              <p className="text-xs text-[#3ddc84]">{address || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}</p>
            ) : (
              <button type="button" onClick={detectLocation} className="text-xs text-[#ff2d2d] underline">
                Allow location access
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1">Your Name (optional)</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-[#333] bg-[#121214] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#ff2d2d] focus:outline-none" placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1">Phone (optional)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border border-[#333] bg-[#121214] px-3 py-2 text-sm text-white placeholder-[#555] focus:border-[#ff2d2d] focus:outline-none" placeholder="408-555-0000" />
            </div>
          </div>

          <button
            type="submit"
            disabled={!description || !coords || submitting}
            className="w-full rounded-xl bg-[#ff2d2d] py-4 text-base font-bold text-white transition-colors hover:bg-[#e02525] disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ minHeight: "56px" }}
          >
            {submitting ? "Submitting..." : <><Send size={18} /> Submit Report</>}
          </button>
        </form>

        <p className="text-center text-[10px] text-[#555]">
          Powered by Flarepath AI Fire Dispatch
        </p>
      </div>
    </div>
  );
}
