"use client";

import { useState, useMemo } from "react";
import {
  Star, Shield, Award, Calendar, Radio, Activity,
  Heart, Thermometer, Wind, Search, UsersRound,
} from "lucide-react";
import type { CrewMember } from "@/lib/crew-data";
import { synthesizeBiometric, TASKS, type TaskKey } from "@/lib/chief-data";
import { useChief } from "@/lib/chief-store";

interface Props {
  captain: CrewMember | null;
  members: CrewMember[];
  unitCallSign: string;
  unitDisplayName: string;
  stationName: string | null;
  radioChannel: string;
  shift: "A" | "B" | "C";
}

export default function CrewProfilesView({
  captain, members, unitCallSign, unitDisplayName, stationName, radioChannel, shift,
}: Props) {
  const { state } = useChief();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(captain?.badge ?? null);

  const all = useMemo(() => [captain, ...members].filter(Boolean) as CrewMember[], [captain, members]);
  const filtered = all.filter((m) =>
    !q ||
    m.name.toLowerCase().includes(q.toLowerCase()) ||
    m.rank.toLowerCase().includes(q.toLowerCase()) ||
    m.badge.toLowerCase().includes(q.toLowerCase())
  );

  const assignmentByBadge = new Map(state.assignments.map((a) => [a.badge, a.task]));
  const active = selected ? all.find((m) => m.badge === selected) : all[0];

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left list */}
      <aside className="glass glass-divider-r flex flex-col shrink-0" style={{ width: 280 }}>
        <div className="px-4 py-3 glass-divider-b">
          <div className="flex items-center gap-2 mb-1">
            <UsersRound size={13} style={{ color: "#eab308" }} />
            <span className="text-[12px] font-semibold text-white">Crew Roster</span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded tabular-nums" style={{ background: "rgba(255,255,255,0.05)", color: "#a1a1aa" }}>
              {all.length}
            </span>
          </div>
          <div className="text-[10px]" style={{ color: "#71717a" }}>
            {unitDisplayName} · {stationName ?? "—"} · Shift {shift}
          </div>
          <div className="mt-2 flex items-center gap-2 px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <Search size={11} style={{ color: "#71717a" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, rank, badge…"
              className="bg-transparent outline-none text-[11px] text-white placeholder-[#52525b] flex-1"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto py-2">
          {filtered.length === 0 ? (
            <div className="text-center py-6 text-[11px]" style={{ color: "#71717a" }}>No matches</div>
          ) : filtered.map((m) => {
            const isLeader = captain && m.badge === captain.badge;
            const isSelected = m.badge === selected;
            const task = assignmentByBadge.get(m.badge);
            const taskMeta = task ? TASKS.find((t) => t.key === task) : null;
            return (
              <button
                key={m.badge}
                onClick={() => setSelected(m.badge)}
                className="w-full text-left px-3 py-2 transition-colors hover:bg-white/[0.03]"
                style={{
                  background: isSelected ? "rgba(234,179,8,0.08)" : "transparent",
                  borderLeft: `3px solid ${isSelected ? "#eab308" : "transparent"}`,
                }}
              >
                <div className="flex items-center gap-2">
                  {isLeader ? <Star size={10} fill="#eab308" stroke="#eab308" /> : <Shield size={10} style={{ color: "#52525b" }} />}
                  <span className="text-[12px] font-medium text-white truncate">{m.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px]" style={{ color: "#a1a1aa" }}>
                  <span className="truncate">{m.rank}</span>
                  <span className="ml-auto font-mono text-[9px] shrink-0" style={{ color: "#52525b" }}>{m.badge}</span>
                </div>
                {taskMeta && (
                  <div className="mt-1 inline-block text-[9px] px-1.5 py-0.5 rounded"
                    style={{ background: `${taskMeta.color}1a`, color: taskMeta.color }}>
                    {taskMeta.short}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Detail */}
      <section className="flex-1 overflow-auto p-6">
        {active ? <ProfileDetail member={active} isLeader={captain?.badge === active.badge} unitCallSign={unitCallSign} radioChannel={radioChannel} task={assignmentByBadge.get(active.badge)} /> : (
          <div className="text-[12px]" style={{ color: "#71717a" }}>Select a member.</div>
        )}
      </section>
    </div>
  );
}

function ProfileDetail({
  member, isLeader, unitCallSign, radioChannel, task,
}: { member: CrewMember; isLeader: boolean; unitCallSign: string; radioChannel: string; task?: TaskKey }) {
  const bio = synthesizeBiometric(member.badge, isLeader ? "interior" : task === "rit_standby" ? "rit" : "staged");
  const taskMeta = task ? TASKS.find((t) => t.key === task) : null;

  // Deterministic "career highlights" seeded from the badge
  const careerHash = hash(member.badge);
  const hireYear = new Date().getFullYear() - member.years;
  const academy = pick(careerHash, ["Sacramento FTA", "Cal Fire Academy (Ione)", "SJFD Academy 45", "Phoenix Regional Academy", "MIT Lincoln (Federal)"]);
  const priorRole = pick(careerHash >> 3, ["U.S. Marines · Combat Medic", "Sonoma Valley FD · FF", "San José PD · EMT", "City College paramedic program", "Private ambulance service", "Volunteer responder · Santa Clara"]);
  const notableIncidents = pickMany(careerHash >> 6, [
    "2022 Alum Rock brush fire — 4-unit task force lead",
    "2021 Levi's Stadium mass-casualty drill — triage lead",
    "2023 Santana Row high-rise · 3rd-alarm — entry team",
    "2020 CZU Lightning complex deployment — 14 days",
    "2024 I-280 MCI · 7 vehicles — extrication",
    "2021 Willow Glen grease fire — command transfer",
    "2023 Alviso wetlands wildland-urban interface",
  ], 3);
  const languages = member.name.endsWith("z") || member.name.includes("Torres") || member.name.includes("Morales") ? ["English", "Spanish"]
    : member.name.includes("Chen") || member.name.includes("Nguyen") || member.name.includes("Vu") ? ["English", member.name.includes("Chen") ? "Mandarin" : "Vietnamese"]
    : member.name.includes("Patel") || member.name.includes("Shah") ? ["English", "Gujarati"]
    : ["English"];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <header
        className="glass-card rounded-xl p-5 flex items-start gap-5"
        style={{
          background: isLeader
            ? "linear-gradient(135deg, rgba(234,179,8,0.1), rgba(234,179,8,0.02))"
            : undefined,
          border: isLeader ? "1px solid rgba(234,179,8,0.3)" : undefined,
        }}
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: isLeader
              ? "linear-gradient(135deg, rgba(234,179,8,0.3), rgba(234,179,8,0.08))"
              : "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            border: `1px solid ${isLeader ? "rgba(234,179,8,0.55)" : "rgba(255,255,255,0.12)"}`,
            boxShadow: isLeader ? "0 0 24px rgba(234,179,8,0.3)" : "none",
            color: isLeader ? "#eab308" : "#e4e4e7",
            fontSize: 26, fontWeight: 700,
          }}
        >
          {isLeader ? <Star size={32} fill="#eab308" stroke="#eab308" /> : member.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[22px] font-bold text-white tracking-tight">{member.name}</h1>
            {isLeader && (
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded"
                style={{ background: "rgba(234,179,8,0.18)", color: "#eab308", border: "1px solid rgba(234,179,8,0.4)" }}>
                Unit Leader
              </span>
            )}
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: isLeader ? "#eab308" : "#a1a1aa" }}>
            {member.rank}
          </p>
          <div className="flex items-center gap-4 mt-2 text-[10px]" style={{ color: "#71717a" }}>
            <span className="flex items-center gap-1 font-mono">
              <Shield size={10} />{member.badge}
            </span>
            <span className="flex items-center gap-1"><Calendar size={10} />{member.years}y service · since {hireYear}</span>
            <span className="flex items-center gap-1"><Radio size={10} />{radioChannel}</span>
            <span>· {unitCallSign}</span>
          </div>
          {taskMeta && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded"
              style={{ background: `${taskMeta.color}18`, color: taskMeta.color, border: `1px solid ${taskMeta.color}40` }}>
              <Activity size={10} />
              Currently: {taskMeta.label}
            </div>
          )}
        </div>
      </header>

      {/* Vitals */}
      <section className="glass-card rounded-xl p-4">
        <h2 className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: "#71717a" }}>Live Vitals</h2>
        <div className="grid grid-cols-4 gap-3">
          <Stat icon={Heart} label="Heart rate" value={`${bio.heart_rate}`} unit="bpm" accent={bio.heart_rate > 160 ? "#ef4444" : bio.heart_rate > 140 ? "#f97316" : "#22c55e"} />
          <Stat icon={Thermometer} label="Core temp" value={bio.core_temp_c.toFixed(1)} unit="°C" accent={bio.core_temp_c > 38 ? "#ef4444" : "#22c55e"} />
          <Stat icon={Wind} label="SCBA" value={`${bio.air_psi}`} unit="psi" accent={bio.air_psi < 1500 ? "#ef4444" : bio.air_psi < 2500 ? "#eab308" : "#22c55e"} />
          <Stat icon={Activity} label="Status" value={bio.status.toUpperCase()} unit="" accent={bio.status === "critical" ? "#ef4444" : bio.status === "warning" ? "#f97316" : bio.status === "elevated" ? "#eab308" : "#22c55e"} />
        </div>
      </section>

      {/* Career */}
      <section className="glass-card rounded-xl p-4">
        <h2 className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: "#71717a" }}>Background</h2>
        <div className="grid grid-cols-2 gap-4 text-[11px]" style={{ color: "#e4e4e7" }}>
          <Detail label="Academy" value={academy} />
          <Detail label="Prior service" value={priorRole} />
          <Detail label="Languages" value={languages.join(", ")} />
          <Detail label="Years in unit" value={`${Math.max(1, member.years - 2)}y of ${member.years}y total`} />
        </div>
      </section>

      {/* Certifications */}
      {member.certifications && member.certifications.length > 0 && (
        <section className="glass-card rounded-xl p-4">
          <h2 className="text-[10px] uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5" style={{ color: "#71717a" }}>
            <Award size={11} /> Certifications
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {member.certifications.map((c) => (
              <span key={c} className="text-[10px] px-2 py-1 rounded"
                style={{ background: "rgba(168,85,247,0.12)", color: "#c4b5fd", border: "1px solid rgba(168,85,247,0.25)" }}>
                {c}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Notable incidents */}
      <section className="glass-card rounded-xl p-4">
        <h2 className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: "#71717a" }}>Notable Deployments</h2>
        <ul className="space-y-1.5 text-[11px]" style={{ color: "#d4d4d8" }}>
          {notableIncidents.map((i, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="text-[#eab308]">·</span>
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, unit, accent }: { icon: typeof Heart; label: string; value: string; unit: string; accent: string }) {
  return (
    <div className="rounded-lg px-3 py-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider mb-1" style={{ color: "#71717a" }}>
        <Icon size={10} style={{ color: accent }} />
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[16px] font-bold tabular-nums" style={{ color: accent }}>{value}</span>
        {unit && <span className="text-[9px] opacity-60" style={{ color: accent }}>{unit}</span>}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "#71717a" }}>{label}</div>
      <div>{value}</div>
    </div>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function pick<T>(n: number, arr: T[]): T { return arr[n % arr.length]; }
function pickMany<T>(n: number, arr: T[], k: number): T[] {
  const out = new Set<T>();
  let seed = n;
  while (out.size < Math.min(k, arr.length)) {
    out.add(arr[seed % arr.length]);
    seed = (seed * 31 + 7) & 0x7fffffff;
  }
  return Array.from(out);
}
