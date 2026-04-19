"use client";

import { MapPin, Clock, Users } from "lucide-react";

interface IncidentCardProps {
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "triaged" | "dispatched" | "on_scene" | "resolved" | "cancelled";
  type: string;
  address: string;
  time: string;
  assignedCount?: number;
  onClick?: () => void;
  className?: string;
}

const SEVERITY_STYLES = {
  critical: "bg-[#ff2d2d]/20 text-[#ff2d2d]",
  high: "bg-[#ff7b1c]/20 text-[#ff7b1c]",
  medium: "bg-[#ffc93c]/20 text-[#ffc93c]",
  low: "bg-[#3ddc84]/20 text-[#3ddc84]",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-[#ff2d2d]/10 text-[#ff2d2d]",
  triaged: "bg-[#ff7b1c]/10 text-[#ff7b1c]",
  dispatched: "bg-[#ffc93c]/10 text-[#ffc93c]",
  on_scene: "bg-[#3ddc84]/10 text-[#3ddc84]",
  resolved: "bg-[#888]/10 text-[#888]",
  cancelled: "bg-[#555]/10 text-[#555]",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open", triaged: "Triaged", dispatched: "Dispatched",
  on_scene: "On Scene", resolved: "Resolved", cancelled: "Cancelled",
};

export default function IncidentCard({
  severity, status, type, address, time, assignedCount = 0, onClick, className = "",
}: IncidentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border border-[#1a1a1e] bg-[#121214] p-4 text-left transition-colors hover:border-[#2a2a2e] hover:bg-[#1a1a1e] ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[severity]}`}>
          {severity}
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {STATUS_LABELS[status]}
        </span>
      </div>
      <h3 className="mt-2 text-sm font-medium text-white capitalize">
        {type.replace(/_/g, " ")}
      </h3>
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-[#888]">
          <MapPin size={12} />
          <span className="truncate">{address}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-[#888]">
          <div className="flex items-center gap-1.5">
            <Clock size={12} />
            <span>{time}</span>
          </div>
          {assignedCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Users size={12} />
              <span>{assignedCount}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
