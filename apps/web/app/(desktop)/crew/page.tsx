"use client";

import { useQuery } from "@tanstack/react-query";
import { User, Clock, Activity, Shield } from "lucide-react";

interface CrewMember {
  id: string;
  name: string;
  role: string;
  status: string;
  skills: string[];
  total_dispatches: number;
  completed_dispatches: number;
  avg_ack_time_seconds: number | null;
  avg_response_time_seconds: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  available: "#3ddc84",
  on_duty: "#3b82f6",
  off_duty: "#888",
  en_route: "#ffc93c",
  on_scene: "#ff7b1c",
};

const ROLE_LABELS: Record<string, string> = {
  firefighter: "Firefighter",
  dispatcher: "Dispatcher",
  chief: "Chief",
  admin: "Admin",
};

export default function CrewPage() {
  const { data: crew = [], isLoading } = useQuery<CrewMember[]>({
    queryKey: ["crew-performance"],
    queryFn: async () => {
      const res = await fetch("/api/crew/performance");
      return (await res.json()).data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ff2d2d] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Crew Performance</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {crew.map((member) => (
          <div key={member.id} className="rounded-lg border border-[#1a1a1e] bg-[#121214] p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1e]">
                  <User size={14} className="text-[#888]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{member.name}</p>
                  <p className="text-[10px] text-[#888]">{ROLE_LABELS[member.role] ?? member.role}</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: STATUS_COLORS[member.status] ?? "#888" }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[member.status] ?? "#888" }} />
                {member.status.replace(/_/g, " ")}
              </span>
            </div>

            {/* Skills */}
            {member.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {member.skills.map((skill) => (
                  <span key={skill} className="flex items-center gap-0.5 rounded bg-[#1a1a1e] px-1.5 py-0.5 text-[10px] text-[#888]">
                    <Shield size={8} />
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded bg-[#0a0a0b] p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#555]">
                  <Activity size={10} />
                  Dispatches
                </div>
                <p className="mt-0.5 text-lg font-bold text-white">{member.total_dispatches}</p>
              </div>
              <div className="rounded bg-[#0a0a0b] p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#555]">
                  <Clock size={10} />
                  Avg Response
                </div>
                <p className="mt-0.5 text-lg font-bold text-white">
                  {member.avg_response_time_seconds
                    ? `${Math.round(member.avg_response_time_seconds / 60)}m`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        ))}

        {crew.length === 0 && (
          <p className="col-span-full text-center text-sm text-[#555] py-8">No crew members found</p>
        )}
      </div>
    </div>
  );
}
