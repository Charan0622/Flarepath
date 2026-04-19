"use client";

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

export default function IncidentFeed({
  onSelect,
  selectedId,
  incidents,
  isLoading,
}: {
  onSelect: (id: string) => void;
  selectedId: string | null;
  incidents: Incident[];
  isLoading: boolean;
}) {
  if (isLoading) return <FeedSkeleton />;

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...incidents].sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="flex flex-col gap-2 p-3">
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
