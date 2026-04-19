"use client";

import { motion } from "framer-motion";
import { MapPin, Clock } from "lucide-react";

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

const SEVERITY_DOT: Record<string, string> = {
  critical: "#ff2d2d", high: "#ff7b1c", medium: "#ffc93c", low: "#3ddc84",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open", triaged: "Triaged", dispatched: "Dispatched",
  on_scene: "On Scene", resolved: "Resolved", cancelled: "Cancelled",
};

export default function IncidentCard({
  severity, status, type, address, time, onClick, className = "",
}: IncidentCardProps) {
  const dotColor = SEVERITY_DOT[severity];
  const isActive = !["resolved", "cancelled"].includes(status);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`group w-full rounded-lg border border-white/[0.04] bg-white/[0.02] px-3.5 py-3 text-left transition-all duration-200 hover:bg-white/[0.05] hover:border-white/[0.08] ${className}`}
    >
      {/* Top: severity dot + type + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            {isActive && severity === "critical" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" style={{ backgroundColor: dotColor }} />
            )}
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
          </span>
          <span className="text-[13px] font-medium text-white/90 capitalize">
            {type.replace(/_/g, " ")}
          </span>
        </div>
        <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Address */}
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/40">
        <MapPin size={10} className="shrink-0" />
        <span className="truncate">{address}</span>
      </div>

      {/* Time */}
      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/25">
        <Clock size={9} />
        <span>{time}</span>
      </div>
    </motion.button>
  );
}
