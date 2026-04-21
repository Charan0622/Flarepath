"use client";

import {
  LayoutGrid, UsersRound, Inbox, LogOut,
  Sparkles, Building2, ListChecks, Activity, ClipboardList, History,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import BrandMark from "@/components/BrandMark";

export type ChiefView =
  | "command"
  | "inbox"
  | "crew"
  | "briefing"
  | "preplan"
  | "benchmarks"
  | "vitals"
  | "assignments"
  | "timeline";

interface Item {
  key: ChiefView;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  accent: string;
}

const PRIMARY: Item[] = [
  { key: "command",     label: "Command Deck",      icon: LayoutGrid,    accent: "#eab308" },
  { key: "inbox",       label: "Dispatcher Inbox",  icon: Inbox,         accent: "#3b82f6" },
  { key: "crew",        label: "Crew Profiles",     icon: UsersRound,    accent: "#22c55e" },
];

const OPS: Item[] = [
  { key: "briefing",    label: "AI Briefing",       icon: Sparkles,      accent: "#a855f7" },
  { key: "preplan",     label: "Pre-Plan",          icon: Building2,     accent: "#3b82f6" },
  { key: "benchmarks",  label: "Benchmarks",        icon: ListChecks,    accent: "#22c55e" },
  { key: "vitals",      label: "Vitals",            icon: Activity,      accent: "#ef4444" },
  { key: "assignments", label: "Assignments",       icon: ClipboardList, accent: "#f97316" },
  { key: "timeline",    label: "Timeline",          icon: History,       accent: "#71717a" },
];

export default function ChiefSideRail({ active, onChange, inboxBadge }: {
  active: ChiefView; onChange: (v: ChiefView) => void; inboxBadge?: number;
}) {
  return (
    <nav className="glass glass-divider-r flex flex-col items-center py-3 gap-1 shrink-0" style={{ width: 56 }}>
      <div className="mb-3">
        <BrandMark size={32} animated />
      </div>
      <div className="h-px w-6 mb-2" style={{ background: "rgba(255,255,255,0.08)" }} />

      {PRIMARY.map((it) => <RailItem key={it.key} item={it} active={active === it.key} onChange={onChange} badge={it.key === "inbox" ? inboxBadge : undefined} />)}

      <div className="h-px w-6 my-2" style={{ background: "rgba(255,255,255,0.06)" }} />

      {OPS.map((it) => <RailItem key={it.key} item={it} active={active === it.key} onChange={onChange} />)}

      <div className="flex-1" />

      <form action="/api/auth/logout" method="POST" className="mb-1">
        <button
          type="submit"
          title="Logout"
          className="group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 hover:bg-white/[0.05]"
          style={{ color: "#71717a" }}
        >
          <LogOut size={16} />
          <span
            className="absolute left-full ml-2 hidden whitespace-nowrap rounded-md px-2 py-1 text-[11px] group-hover:block z-50 glass-strong"
            style={{ color: "#e4e4e7" }}
          >
            Logout
          </span>
        </button>
      </form>
    </nav>
  );
}

function RailItem({
  item, active, onChange, badge,
}: { item: Item; active: boolean; onChange: (v: ChiefView) => void; badge?: number }) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onChange(item.key)}
      title={item.label}
      className="group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 hover:scale-[1.04]"
      style={{
        background: active
          ? `linear-gradient(135deg, ${item.accent}22, ${item.accent}06)`
          : "transparent",
        color: active ? item.accent : "#71717a",
        border: active ? `1px solid ${item.accent}4d` : "1px solid transparent",
        boxShadow: active ? `0 0 16px ${item.accent}25, inset 0 1px 0 rgba(255,255,255,0.05)` : "none",
      }}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r"
          style={{ background: item.accent, boxShadow: `0 0 10px ${item.accent}99` }}
        />
      )}
      <Icon size={16} />
      {badge && badge > 0 ? (
        <span
          className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
          style={{ background: "#ef4444", color: "#fff", boxShadow: "0 0 8px rgba(239,68,68,0.6)" }}
        >
          {badge}
        </span>
      ) : null}
      <span
        className="absolute left-full ml-2 hidden whitespace-nowrap rounded-md px-2 py-1 text-[11px] group-hover:block z-50 glass-strong"
        style={{ color: "#e4e4e7" }}
      >
        {item.label}
      </span>
    </button>
  );
}
