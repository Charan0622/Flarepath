"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Users, BarChart3, LogOut } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import BrandMark from "./BrandMark";

interface NavItem {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  label: string;
}

const ITEMS: NavItem[] = [
  { href: "/", icon: Radio, label: "Dispatch" },
  { href: "/teams", icon: Users, label: "Teams" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
];

export default function NavRail() {
  const pathname = usePathname();
  return (
    <nav className="glass glass-divider-r flex flex-col items-center py-3 gap-1">
      {/* Brand — shared mark, wordless at this size */}
      <Link href="/" className="mb-3" title="Flarepath — Command Center">
        <BrandMark size={32} animated />
      </Link>

      <div className="h-px w-6 mb-2" style={{ background: "rgba(255,255,255,0.08)" }} />

      {ITEMS.map((it) => {
        const active = it.href === "/" ? pathname === "/" : pathname?.startsWith(it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            title={it.label}
            className="group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 hover:scale-[1.04]"
            style={{
              background: active ? "linear-gradient(135deg, rgba(239,68,68,0.22), rgba(239,68,68,0.08))" : "transparent",
              color: active ? "#ef4444" : "#71717a",
              border: active ? "1px solid rgba(239,68,68,0.3)" : "1px solid transparent",
              boxShadow: active ? "0 0 16px rgba(239,68,68,0.18), inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
            }}
          >
            {active && (
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r"
                style={{ background: "#ef4444", boxShadow: "0 0 10px rgba(239,68,68,0.6)" }}
              />
            )}
            <Icon size={17} />
            <span
              className="absolute left-full ml-2 hidden whitespace-nowrap rounded-md px-2 py-1 text-[11px] group-hover:block z-50 glass-strong"
              style={{ color: "#e4e4e7" }}
            >
              {it.label}
            </span>
          </Link>
        );
      })}

      <div className="flex-1" />

      <form action="/api/auth/logout" method="POST" className="mb-1">
        <button
          type="submit"
          title="Logout"
          className="group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 hover:bg-white/[0.05] hover:scale-[1.04]"
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
