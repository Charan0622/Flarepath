import { Flame, Map, Bell, User } from "lucide-react";
import Link from "next/link";

const TAB_ITEMS = [
  { href: "/", icon: Flame, label: "Incidents" },
  { href: "/map", icon: Map, label: "Map" },
  { href: "/alerts", icon: Bell, label: "Alerts" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function ResponderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex lg:hidden h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-[#1a1a1e] bg-[#0a0a0b] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚒</span>
          <span className="text-base font-bold tracking-tight">Flarepath</span>
        </div>
        <Bell size={20} className="text-[#888]" />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-[#0a0a0b]">
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className="flex border-t border-[#1a1a1e] bg-[#0a0a0b]">
        {TAB_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center gap-1 py-3 text-[#888] transition-colors hover:text-white"
          >
            <item.icon size={20} />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
