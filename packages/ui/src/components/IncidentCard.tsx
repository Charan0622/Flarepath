import { MapPin, Clock, Users } from "lucide-react";
import SeverityBadge from "./SeverityBadge";
import StatusPill from "./StatusPill";
import { cn } from "../cn";

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

export default function IncidentCard({
  severity,
  status,
  type,
  address,
  time,
  assignedCount = 0,
  onClick,
  className,
}: IncidentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border border-[#1a1a1e] bg-[#121214] p-4 text-left transition-colors hover:border-[#2a2a2e] hover:bg-[#1a1a1e]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <SeverityBadge severity={severity} />
        <StatusPill status={status} />
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
