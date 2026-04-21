"use client";

import { motion } from "framer-motion";
import { MapPin, Clock } from "lucide-react";

interface Props {
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "triaged" | "dispatched" | "on_scene" | "resolved" | "cancelled";
  type: string;
  address: string;
  time: string;
  assignedCount?: number;
  onClick?: () => void;
  className?: string;
}

const COLORS: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
const STATUS_L: Record<string, string> = { open: "Open", triaged: "Triaged", dispatched: "Dispatched", on_scene: "On Scene", resolved: "Resolved", cancelled: "Cancelled" };

export default function IncidentCard({ severity, status, type, address, time, onClick, className = "" }: Props) {
  const color = COLORS[severity];
  const isActive = !["resolved", "cancelled"].includes(status);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group w-full flex gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.04] ${className}`}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium capitalize truncate" style={{ color: "#d8d8dc" }}>
            {type.replace(/_/g, " ")}
          </span>
          <span className="text-[9px] font-medium uppercase tracking-wider shrink-0" style={{ color: isActive ? color : "#48484e" }}>
            {STATUS_L[status]}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: "#68686e" }}>
          <MapPin size={9} className="shrink-0" />
          <span className="truncate">{address}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[9px]" style={{ color: "#48484e" }}>
          <Clock size={8} />
          <span>{time}</span>
          {isActive && severity === "critical" && (
            <span className="ml-1.5 flex items-center gap-1" style={{ color }}>
              <span className="relative w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: color }} />
                <span className="relative block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              </span>
              URGENT
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
