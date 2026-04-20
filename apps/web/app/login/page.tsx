"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const ROLES = [
  {
    key: "dispatcher",
    title: "Dispatcher",
    subtitle: "Command Center",
    description: "Monitor all incidents, dispatch units, manage operations from the control room",
    gradient: "from-red-600 to-orange-600",
    glowColor: "#ef4444",
    avatar: (hovered: boolean) => (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        {/* Head */}
        <circle cx="40" cy="28" r="14" fill={hovered ? "#fbbf24" : "#d4a574"} className="transition-all duration-500" />
        {/* Hair */}
        <path d="M26 24c0-8 6-14 14-14s14 6 14 14" fill="#2c1810" />
        {/* Body */}
        <path d="M20 70c0-12 9-22 20-22s20 10 20 22" fill={hovered ? "#1e3a5f" : "#1e293b"} className="transition-all duration-500" />
        {/* Shirt collar */}
        <path d="M32 48l8 6 8-6" stroke="#3b82f6" strokeWidth="2" fill="none" />
        {/* Headset band */}
        <path d="M22 26c0-10 8-18 18-18s18 8 18 18" stroke={hovered ? "#ef4444" : "#374151"} strokeWidth="3" fill="none" className="transition-all duration-500" />
        {/* Headset ear left */}
        <rect x="18" y="23" width="6" height="10" rx="3" fill={hovered ? "#ef4444" : "#374151"} className="transition-all duration-500" />
        {/* Headset ear right */}
        <rect x="56" y="23" width="6" height="10" rx="3" fill={hovered ? "#ef4444" : "#374151"} className="transition-all duration-500" />
        {/* Microphone */}
        <path d="M18 33c-4 2-6 4-6 6" stroke={hovered ? "#ef4444" : "#374151"} strokeWidth="2" strokeLinecap="round" className="transition-all duration-500" />
        <circle cx="11" cy="40" r="3" fill={hovered ? "#ef4444" : "#374151"} className="transition-all duration-500" />
        {/* Badge */}
        <rect x="36" y="56" width="8" height="6" rx="1" fill="#3b82f6" opacity={hovered ? 1 : 0.6} className="transition-all duration-500" />
      </svg>
    ),
  },
  {
    key: "chief",
    title: "Unit Chief",
    subtitle: "Field Commander",
    description: "Lead your crew on the ground, navigate to incidents, coordinate operations",
    gradient: "from-amber-500 to-yellow-600",
    glowColor: "#eab308",
    avatar: (hovered: boolean) => (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        {/* Head */}
        <circle cx="40" cy="30" r="14" fill={hovered ? "#fbbf24" : "#c4956a"} className="transition-all duration-500" />
        {/* Body */}
        <path d="M20 70c0-12 9-22 20-22s20 10 20 22" fill={hovered ? "#7c2d12" : "#44403c"} className="transition-all duration-500" />
        {/* Captain's hat brim */}
        <ellipse cx="40" cy="20" rx="18" ry="4" fill={hovered ? "#1c1917" : "#292524"} className="transition-all duration-500" />
        {/* Hat top */}
        <path d="M26 20c0-6 6-12 14-12s14 6 14 12" fill={hovered ? "#1c1917" : "#292524"} className="transition-all duration-500" />
        {/* Hat badge */}
        <path d="M36 14l4-3 4 3-1.5 3h-5z" fill={hovered ? "#eab308" : "#78716c"} className="transition-all duration-500" />
        {/* Shoulder epaulettes */}
        <rect x="22" y="50" width="8" height="3" rx="1" fill={hovered ? "#eab308" : "#78716c"} className="transition-all duration-500" />
        <rect x="50" y="50" width="8" height="3" rx="1" fill={hovered ? "#eab308" : "#78716c"} className="transition-all duration-500" />
        {/* Collar */}
        <path d="M32 48l8 5 8-5" stroke={hovered ? "#eab308" : "#a8a29e"} strokeWidth="2" fill="none" className="transition-all duration-500" />
        {/* Radio on chest */}
        <rect x="44" y="55" width="4" height="8" rx="1" fill="#1c1917" />
        <rect x="44" y="53" width="6" height="2" rx="0.5" fill="#374151" />
      </svg>
    ),
  },
  {
    key: "firefighter",
    title: "Unit Member",
    subtitle: "Field Crew",
    description: "Respond to dispatches, navigate to scenes, update status in real-time",
    gradient: "from-emerald-500 to-green-600",
    glowColor: "#22c55e",
    avatar: (hovered: boolean) => (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        {/* Head */}
        <circle cx="40" cy="32" r="13" fill={hovered ? "#fbbf24" : "#b8896a"} className="transition-all duration-500" />
        {/* Body — turnout coat */}
        <path d="M20 70c0-12 9-22 20-22s20 10 20 22" fill={hovered ? "#854d0e" : "#44403c"} className="transition-all duration-500" />
        {/* Reflective stripes on coat */}
        <path d="M22 62h36" stroke={hovered ? "#fbbf24" : "#78716c"} strokeWidth="2" className="transition-all duration-500" />
        <path d="M24 66h32" stroke={hovered ? "#fbbf24" : "#78716c"} strokeWidth="2" className="transition-all duration-500" />
        {/* Helmet shape */}
        <path d="M24 28c0-10 7-16 16-16s16 6 16 16" fill={hovered ? "#dc2626" : "#374151"} className="transition-all duration-500" />
        {/* Helmet brim */}
        <path d="M22 28h36" stroke={hovered ? "#dc2626" : "#374151"} strokeWidth="4" strokeLinecap="round" className="transition-all duration-500" />
        {/* Helmet front shield */}
        <rect x="35" y="20" width="10" height="7" rx="1" fill={hovered ? "#fbbf24" : "#6b7280"} className="transition-all duration-500" />
        {/* Number on shield */}
        <text x="40" y="25" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#000">30</text>
        {/* Chin strap */}
        <path d="M28 30c0 4 4 6 6 6" stroke={hovered ? "#fbbf24" : "#6b7280"} strokeWidth="1.5" fill="none" className="transition-all duration-500" />
        <path d="M52 30c0 4-4 6-6 6" stroke={hovered ? "#fbbf24" : "#6b7280"} strokeWidth="1.5" fill="none" className="transition-all duration-500" />
      </svg>
    ),
  },
];

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(role: string) {
    setLoading(role);
    const res = await fetch("/api/auth/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const json = await res.json();
    if (json.error) {
      alert(json.error);
      setLoading(null);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6" style={{ background: "#0c0c10" }}>
      {/* Background ambient glow — follows hovered card */}
      {hoveredRole && (
        <motion.div
          key={hoveredRole}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute w-[600px] h-[600px] rounded-full blur-[150px]"
          style={{
            background: ROLES.find((r) => r.key === hoveredRole)?.glowColor ?? "#ef4444",
            opacity: 0.06,
          }}
        />
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 2c-4 4-8 8-8 13a8 8 0 0016 0c0-5-4-9-8-13zm0 18a5 5 0 01-5-5c0-3 2.5-6.4 5-9.2 2.5 2.8 5 6.2 5 9.2a5 5 0 01-5 5z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#eeeef0" }}>
            Flarepath
          </h1>
        </div>
        <p className="text-sm" style={{ color: "#58585e" }}>
          AI-Powered Fire Emergency Dispatch — San Jose Fire Department
        </p>
      </motion.div>

      {/* Role Cards */}
      <div className="flex gap-6 max-w-4xl w-full">
        {ROLES.map((role, index) => (
          <motion.button
            key={role.key}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + index * 0.15 }}
            onClick={() => handleLogin(role.key)}
            onMouseEnter={() => setHoveredRole(role.key)}
            onMouseLeave={() => setHoveredRole(null)}
            disabled={loading !== null}
            className="group relative flex-1 flex flex-col items-center rounded-2xl p-8 text-center transition-all duration-300 disabled:opacity-60"
            style={{
              background: hoveredRole === role.key ? "#18181e" : "#13131a",
              border: `1px solid ${hoveredRole === role.key ? "#2a2a36" : "#1e1e28"}`,
              transform: hoveredRole === role.key ? "translateY(-8px)" : "translateY(0)",
              boxShadow: hoveredRole === role.key ? `0 20px 60px ${role.glowColor}15, 0 0 0 1px ${role.glowColor}20` : "none",
            }}
          >
            {/* Avatar */}
            <motion.div
              className="mb-6 relative"
              animate={{
                scale: hoveredRole === role.key ? 1.1 : 1,
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* Glow behind avatar */}
              <div
                className="absolute inset-0 rounded-full blur-2xl transition-opacity duration-500"
                style={{
                  background: role.glowColor,
                  opacity: hoveredRole === role.key ? 0.15 : 0,
                  transform: "scale(1.5)",
                }}
              />
              <div className="relative">
                {role.avatar(hoveredRole === role.key)}
              </div>
            </motion.div>

            {/* Title */}
            <h2
              className="text-lg font-semibold transition-colors duration-300"
              style={{ color: hoveredRole === role.key ? "#eeeef0" : "#a0a0a8" }}
            >
              {role.title}
            </h2>

            {/* Subtitle with gradient */}
            <span
              className="mt-1 text-xs font-medium tracking-wider uppercase transition-all duration-300"
              style={{
                color: hoveredRole === role.key ? role.glowColor : "#58585e",
              }}
            >
              {role.subtitle}
            </span>

            {/* Description */}
            <p
              className="mt-3 text-xs leading-relaxed transition-colors duration-300"
              style={{ color: hoveredRole === role.key ? "#9898a0" : "#48484e" }}
            >
              {role.description}
            </p>

            {/* CTA */}
            <div
              className="mt-6 w-full rounded-lg py-2.5 text-sm font-medium transition-all duration-300"
              style={{
                background: hoveredRole === role.key
                  ? `linear-gradient(135deg, ${role.glowColor}, ${role.glowColor}cc)`
                  : "#1e1e28",
                color: hoveredRole === role.key ? "#fff" : "#58585e",
              }}
            >
              {loading === role.key ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Entering...
                </span>
              ) : (
                "Enter"
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-[11px]"
        style={{ color: "#38383e" }}
      >
        Prototype Demo — No credentials required
      </motion.p>
    </div>
  );
}
