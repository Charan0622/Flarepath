import {
  Flame,
  Map,
  Radio,
  BarChart3,
  Users,
  Settings,
} from "lucide-react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/", icon: Flame, label: "Incidents" },
  { href: "/map", icon: Map, label: "Live Map" },
  { href: "/dispatch", icon: Radio, label: "Dispatch" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/crew", icon: Users, label: "Crew" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function DesktopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="hidden lg:flex h-screen">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-[#1a1a1e] bg-[#0a0a0b]">
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-[#1a1a1e] px-4 py-4">
          <span className="text-2xl">🚒</span>
          <span className="text-lg font-bold tracking-tight">Flarepath</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[#888] transition-colors hover:bg-[#1a1a1e] hover:text-white"
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-[#1a1a1e] p-2 space-y-1">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-[#0a0a0b]">
        {children}
      </main>
    </div>
  );
}
