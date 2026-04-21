"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BrandMark from "@/components/BrandMark";

const ROLES = [
  {
    key: "dispatcher",
    title: "Dispatcher",
    subtitle: "Command Center",
    description: "Monitor all incidents, dispatch units, manage operations",
    avatar: (h: boolean) => (
      <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
        <circle cx="45" cy="32" r="15" fill={h ? "#f5c896" : "#c4a07a"} className="transition-all duration-700" />
        <path d="M22 80c0-14 10-24 23-24s23 10 23 24" fill={h ? "#1a2744" : "#1e293b"} className="transition-all duration-700" />
        <path d="M25 29c0-11 9-19 20-19s20 8 20 19" stroke={h ? "#f8f8f8" : "#4b5563"} strokeWidth="3" fill="none" className="transition-all duration-700" />
        <rect x="20" y="26" width="7" height="11" rx="3.5" fill={h ? "#f8f8f8" : "#4b5563"} className="transition-all duration-700" />
        <rect x="63" y="26" width="7" height="11" rx="3.5" fill={h ? "#f8f8f8" : "#4b5563"} className="transition-all duration-700" />
        <path d="M20 37c-4 2-7 5-7 8" stroke={h ? "#f8f8f8" : "#4b5563"} strokeWidth="2.5" strokeLinecap="round" className="transition-all duration-700" />
        <circle cx="12" cy="46" r="3.5" fill={h ? "#f8f8f8" : "#4b5563"} className="transition-all duration-700" />
        <path d="M26 20c1-4 4-7 8-8" stroke="#1a1a2e" strokeWidth="6" strokeLinecap="round" />
        <path d="M64 20c-1-4-4-7-8-8" stroke="#1a1a2e" strokeWidth="6" strokeLinecap="round" />
        <path d="M36 53l9 6 9-6" stroke={h ? "#60a5fa" : "#374151"} strokeWidth="2" fill="none" className="transition-all duration-700" />
        <rect x="40" y="62" width="10" height="5" rx="1" fill={h ? "#60a5fa" : "#374151"} opacity="0.7" className="transition-all duration-700" />
      </svg>
    ),
  },
  {
    key: "chief",
    title: "Unit Chief",
    subtitle: "Field Commander",
    description: "Lead your crew, navigate to incidents, coordinate on ground",
    avatar: (h: boolean) => (
      <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
        <circle cx="45" cy="34" r="15" fill={h ? "#f5c896" : "#b8896a"} className="transition-all duration-700" />
        <path d="M22 80c0-14 10-24 23-24s23 10 23 24" fill={h ? "#3d1f0a" : "#44403c"} className="transition-all duration-700" />
        <path d="M27 30c0-10 8-17 18-17s18 7 18 17" fill={h ? "#111" : "#292524"} className="transition-all duration-700" />
        <ellipse cx="45" cy="23" rx="20" ry="4.5" fill={h ? "#111" : "#292524"} className="transition-all duration-700" />
        <path d="M39 16l6-5 6 5-2 4h-8z" fill={h ? "#fbbf24" : "#78716c"} className="transition-all duration-700" />
        <rect x="24" y="58" width="10" height="3.5" rx="1.5" fill={h ? "#fbbf24" : "#57534e"} className="transition-all duration-700" />
        <rect x="56" y="58" width="10" height="3.5" rx="1.5" fill={h ? "#fbbf24" : "#57534e"} className="transition-all duration-700" />
        <path d="M36 53l9 5 9-5" stroke={h ? "#fbbf24" : "#78716c"} strokeWidth="2" fill="none" className="transition-all duration-700" />
        <rect x="50" y="62" width="5" height="9" rx="1.5" fill="#1c1917" />
        <line x1="52.5" y1="60" x2="56" y2="56" stroke="#4b5563" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    key: "firefighter",
    title: "Unit Member",
    subtitle: "Field Crew",
    description: "Respond to dispatches, navigate to scenes, update status",
    avatar: (h: boolean) => (
      <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
        <circle cx="45" cy="36" r="14" fill={h ? "#f5c896" : "#b08060"} className="transition-all duration-700" />
        <path d="M22 80c0-14 10-24 23-24s23 10 23 24" fill={h ? "#78350f" : "#44403c"} className="transition-all duration-700" />
        <path d="M26 68h38" stroke={h ? "#fbbf24" : "#6b7280"} strokeWidth="2.5" className="transition-all duration-700" />
        <path d="M28 73h34" stroke={h ? "#fbbf24" : "#6b7280"} strokeWidth="2.5" className="transition-all duration-700" />
        <path d="M27 31c0-11 8-18 18-18s18 7 18 18" fill={h ? "#b91c1c" : "#374151"} className="transition-all duration-700" />
        <path d="M24 31h42" stroke={h ? "#b91c1c" : "#374151"} strokeWidth="5" strokeLinecap="round" className="transition-all duration-700" />
        <rect x="38" y="22" width="14" height="8" rx="1.5" fill={h ? "#fbbf24" : "#6b7280"} className="transition-all duration-700" />
        <text x="45" y="29" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#000" className="transition-all duration-700">30</text>
        <path d="M30 33c0 5 5 7 7 7" stroke={h ? "#fbbf24" : "#6b7280"} strokeWidth="1.5" fill="none" className="transition-all duration-700" />
        <path d="M60 33c0 5-5 7-7 7" stroke={h ? "#fbbf24" : "#6b7280"} strokeWidth="1.5" fill="none" className="transition-all duration-700" />
        <circle cx="45" cy="17" r="2" fill={h ? "#ef4444" : "#6b7280"} className="transition-all duration-700" />
      </svg>
    ),
  },
];

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Aurora background */}
      <div className="absolute inset-0" style={{ background: "#08080c" }}>
        {/* Warm aurora layers */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[60%] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(ellipse, #7f1d1d 0%, transparent 70%)" }} />
          <div className="absolute top-[10%] right-[-15%] w-[60%] h-[70%] rounded-full blur-[130px]"
            style={{ background: "radial-gradient(ellipse, #92400e 0%, transparent 70%)" }} />
          <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full blur-[100px]"
            style={{ background: "radial-gradient(ellipse, #78350f 0%, transparent 70%)" }} />
          <div className="absolute top-[30%] left-[40%] w-[40%] h-[40%] rounded-full blur-[90px]"
            style={{ background: "radial-gradient(ellipse, #991b1b 0%, transparent 70%)" }} />
        </div>
        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo + tagline */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 text-center"
        >
          <div className="flex items-center justify-center gap-4 mb-5">
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 10px 30px rgba(239,68,68,0.35))" }}
            >
              <BrandMark size={96} animated />
            </motion.div>
            <h1 className="text-6xl font-bold tracking-tight" style={{ color: "#f5f5f5", letterSpacing: "-0.02em" }}>
              Flarepath
            </h1>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-lg font-light tracking-wide"
            style={{ color: "#d4a574" }}
          >
            Every second burns. We light the fastest way through.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-2 text-xs tracking-[0.2em] uppercase"
            style={{ color: "#8b6d4f" }}
          >
            AI-Powered Fire Emergency Dispatch
          </motion.p>
        </motion.div>

        {/* Role cards */}
        <div className="flex gap-5 max-w-4xl w-full">
          {ROLES.map((role, i) => (
            <motion.button
              key={role.key}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => handleLogin(role.key)}
              onMouseEnter={() => setHovered(role.key)}
              onMouseLeave={() => setHovered(null)}
              disabled={loading !== null}
              className="group relative flex-1 flex flex-col items-center rounded-2xl p-7 pt-8 text-center transition-all duration-500 disabled:opacity-50 overflow-hidden"
              style={{
                background: hovered === role.key
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${hovered === role.key ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}`,
                backdropFilter: "blur(20px)",
                transform: hovered === role.key ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
                boxShadow: hovered === role.key ? "0 24px 48px rgba(0,0,0,0.4)" : "0 4px 16px rgba(0,0,0,0.2)",
              }}
            >
              {/* Shimmer effect on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{
                  background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 55%, transparent 60%)",
                  backgroundSize: "200% 100%",
                  animation: hovered === role.key ? "shimmer 2s ease-in-out infinite" : "none",
                }}
              />

              {/* Avatar */}
              <motion.div
                className="relative mb-5"
                animate={{ scale: hovered === role.key ? 1.08 : 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {role.avatar(hovered === role.key)}
              </motion.div>

              {/* Title */}
              <h2 className="text-base font-semibold transition-colors duration-500"
                style={{ color: hovered === role.key ? "#f5f5f5" : "#a0a0a8" }}>
                {role.title}
              </h2>
              <span className="mt-1 text-[10px] font-medium tracking-[0.15em] uppercase transition-colors duration-500"
                style={{ color: hovered === role.key ? "#d4a574" : "#505058" }}>
                {role.subtitle}
              </span>
              <p className="mt-3 text-[11px] leading-relaxed transition-colors duration-500"
                style={{ color: hovered === role.key ? "#9898a0" : "#404048" }}>
                {role.description}
              </p>

              {/* Enter button */}
              <div
                className="mt-6 w-full rounded-xl py-2.5 text-[12px] font-semibold tracking-wide transition-all duration-500"
                style={{
                  background: hovered === role.key
                    ? "linear-gradient(135deg, rgba(239,68,68,0.9), rgba(249,115,22,0.9))"
                    : "rgba(255,255,255,0.04)",
                  color: hovered === role.key ? "#fff" : "#505058",
                  boxShadow: hovered === role.key ? "0 4px 20px rgba(239,68,68,0.25)" : "none",
                }}
              >
                {loading === role.key ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Entering...
                  </span>
                ) : "Enter"}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-14 text-[10px] tracking-widest uppercase"
          style={{ color: "#2a2a30" }}
        >
          San Jose Fire Department — Prototype
        </motion.p>
      </div>

      {/* Shimmer keyframes */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
