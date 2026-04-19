"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import IncidentCard from "./IncidentCardWrapper";
import { FeedSkeleton } from "./LoadingSkeleton";

interface Incident {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "triaged" | "dispatched" | "on_scene" | "resolved" | "cancelled";
  address: string;
  created_at: string;
}

async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch("/api/incidents?limit=50");
  const json = await res.json();
  return json.data?.incidents ?? [];
}

export default function IncidentFeed({
  onSelect,
  selectedId,
}: {
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const { data: incidents = [], refetch, isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: fetchIncidents,
  });

  if (isLoading) return <FeedSkeleton />;

  // Subscribe to realtime changes
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("incidents-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        () => { refetch(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  // Sort: critical first, then by time descending
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...incidents].sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">
          Incidents ({incidents.length})
        </h2>
      </div>
      {sorted.length === 0 ? (
        <p className="px-1 py-8 text-center text-sm text-[#555]">
          No active incidents
        </p>
      ) : (
        sorted.map((incident) => (
          <IncidentCard
            key={incident.id}
            severity={incident.severity}
            status={incident.status}
            type={incident.type}
            address={incident.address}
            time={new Date(incident.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            onClick={() => onSelect(incident.id)}
            className={selectedId === incident.id ? "border-[#ff2d2d]/50 bg-[#1a1a1e]" : ""}
          />
        ))
      )}
    </div>
  );
}
