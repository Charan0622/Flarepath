"use client";

import { motion } from "framer-motion";
import { MapPin, Clock, Users, Zap } from "lucide-react";

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

const SEVERITY_CONFIG = {
  critical: { bg: "bg-gradient-to-r from-[#ff2d2d]/20 to-[#ff2d2d]/5", border: "border-[#ff2d2d]/30", text: "text-[#ff2d2d]", glow: "shadow-[0_0_15px_rgba(255,45,45,0.15)]", dot: "bg-[#ff2d2d]", icon: true },
  high: { bg: "bg-gradient-to-r from-[#ff7b1c]/15 to-transparent", border: "border-[#ff7b1c]/20", text: "text-[#ff7b1c]", glow: "", dot: "bg-[#ff7b1c]", icon: false },
  medium: { bg: "bg-[#121214]", border: "border-[#ffc93c]/15", text: "text-[#ffc93c]", glow: "", dot: "bg-[#ffc93c]", icon: false },
  low: { bg: "bg-[#121214]", border: "border-[#1a1a1e]", text: "text-[#3ddc84]", glow: "", dot: "bg-[#3ddc84]", icon: false },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "OPEN", color: "#ff2d2d" },
  triaged: { label: "TRIAGED", color: "#ff7b1c" },
  dispatched: { label: "DISPATCHED", color: "#ffc93c" },
  on_scene: { label: "ON SCENE", color: "#3ddc84" },
  resolved: { label: "RESOLVED", color: "#888" },
  cancelled: { label: "CANCELLED", color: "#555" },
};

const TYPE_ICONS: Record<string, string> = {
  structure_fire: "🏠", vehicle_fire: "🚗", wildfire: "🌲",
  medical: "🏥", hazmat: "☣️", rescue: "🆘", false_alarm: "✅", other: "📋",
};

export default function IncidentCard({
  severity, status, type, address, time, assignedCount = 0, onClick, className = "",
}: IncidentCardProps) {
  const sev = SEVERITY_CONFIG[severity];
  const stat = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`w-full rounded-xl border ${sev.border} ${sev.bg} ${sev.glow} p-3.5 text-left transition-all ${className}`}
    >
      {/* Top row: type icon + severity + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{TYPE_ICONS[type] ?? "🔥"}</span>
          <div>
            <h3 className="text-sm font-semibold text-white capitalize">
              {type.replace(/_/g, " ")}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sev.icon && (
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Zap size={12} className="text-[#ff2d2d]" fill="#ff2d2d" />
            </motion.div>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sev.text}`} style={{ backgroundColor: `${stat.color}15` }}>
            {severity.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-2 flex items-center gap-1.5">
        <motion.span
          className={`h-1.5 w-1.5 rounded-full ${sev.dot}`}
          animate={status === "open" ? { opacity: [1, 0.3, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <span className="text-[10px] font-semibold tracking-wider" style={{ color: stat.color }}>
          {stat.label}
        </span>
      </div>

      {/* Address + time */}
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-[#888]">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{address}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#666]">
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>{time}</span>
          </div>
          {assignedCount > 0 && (
            <div className="flex items-center gap-1">
              <Users size={10} />
              <span>{assignedCount} units</span>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}
