"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: string;
  span?: number;             // 12-col grid span (default 4)
  rowSpan?: number;          // optional vertical span
  delta?: { value: number; label?: string; good?: "up" | "down" } | null;
  trailing?: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
  className?: string;
  children: ReactNode;
}

export default function AnalyticsCard({
  title, subtitle, icon: Icon, accent = "#e4e4e7",
  span = 4, rowSpan, delta, trailing, footer, compact = false,
  className = "", children,
}: Props) {
  return (
    <div
      className={`glass-card rounded-xl flex flex-col ${compact ? "p-3" : "p-4"} ${className}`}
      style={{
        gridColumn: `span ${span} / span ${span}`,
        gridRow: rowSpan ? `span ${rowSpan} / span ${rowSpan}` : undefined,
        minHeight: 0,
      }}
    >
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2 min-w-0">
          {Icon && (
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: `${accent}14`, border: `1px solid ${accent}30` }}
            >
              <Icon size={13} style={{ color: accent }} />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[12px] font-semibold text-white tracking-tight truncate">{title}</h3>
              {delta && <DeltaPill {...delta} />}
            </div>
            {subtitle && (
              <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "#71717a" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </header>

      <div className="flex-1 min-h-0">{children}</div>

      {footer && (
        <footer className="mt-3 pt-3 text-[10px] flex items-center gap-2" style={{ color: "#71717a", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          {footer}
        </footer>
      )}
    </div>
  );
}

function DeltaPill({ value, label, good = "up" }: { value: number; label?: string; good?: "up" | "down" }) {
  const isUp = value > 0;
  const isDown = value < 0;
  const isPositive = (isUp && good === "up") || (isDown && good === "down");
  const color = value === 0 ? "#71717a" : isPositive ? "#22c55e" : "#ef4444";
  const Icon = value === 0 ? Minus : isUp ? TrendingUp : TrendingDown;
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold tabular-nums shrink-0"
      style={{ background: `${color}15`, color }}
    >
      <Icon size={9} />
      {value > 0 && "+"}{value}
      {label && <span className="opacity-70 ml-0.5">{label}</span>}
    </span>
  );
}

export function MetaChip({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider tabular-nums"
      style={{ background: accent ? `${accent}15` : "rgba(255,255,255,0.04)", color: accent ?? "#a1a1aa" }}
    >
      {children}
    </span>
  );
}
