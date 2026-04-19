"use client";

import { motion } from "framer-motion";
import { MapPin, Clock, ChevronRight } from "lucide-react";

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

const SEVERITY = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "CRITICAL" },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.10)", label: "HIGH" },
  medium:   { color: "#eab308", bg: "rgba(234,179,8,0.08)",  label: "MEDIUM" },
  low:      { color: "#22c55e", bg: "rgba(34,197,94,0.08)",  label: "LOW" },
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open", triaged: "Triaged", dispatched: "Dispatched",
  on_scene: "On Scene", resolved: "Resolved", cancelled: "Cancelled",
};

export default function IncidentCard({
  severity, status, type, address, time, onClick, className = "",
}: IncidentCardProps) {
  const sev = SEVERITY[severity];
  const isActive = ["open", "triaged"].includes(status);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group w-full rounded-lg bg-[--bg-card] border border-[--border] p-3 text-left transition-all duration-150 hover:bg-[--bg-hover] hover:border-[#3a3a42] active:scale-[0.98] ${className}`}
      style={{ "--bg-card": "#15151a", "--bg-hover": "#1c1c22", "--border": "#2a2a32" } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Left: severity indicator + type */}
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="mt-0.5 flex-shrink-0">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sev.color }} />
              {isActive && severity === "critical" && (
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: sev.color, opacity: 0.4 }} />
              )}
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[#eeeef0] capitalize truncate">
                {type.replace(/_/g, " ")}
              </span>
              <span
                className="flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide"
                style={{ backgroundColor: sev.bg, color: sev.color }}
              >
                {sev.label}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-[#9898a0]">
              <MapPin size={10} className="flex-shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          </div>
        </div>

        {/* Right: status + chevron */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[10px] text-[#58585e] uppercase tracking-wide">
            {STATUS_LABELS[status]}
          </span>
          <ChevronRight size={12} className="text-[#58585e] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-2 flex items-center gap-3 pl-5 text-[10px] text-[#58585e]">
        <span className="flex items-center gap-1">
          <Clock size={9} />
          {time}
        </span>
        {["dispatched", "en_route", "on_scene"].includes(status) && (
          <span className="flex items-center gap-1 text-[#eab308]">
            <div className="w-1 h-1 rounded-full bg-[#eab308]" />
            Units responding
          </span>
        )}
      </div>
    </motion.button>
  );
}
