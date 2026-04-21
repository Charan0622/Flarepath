"use client";

import { useState, useEffect } from "react";
import { Users, Activity, Radio } from "lucide-react";
import NavRail from "@/components/NavRail";
import BrandMark from "@/components/BrandMark";
import UnitList from "@/components/teams/UnitList";
import UnitEditor from "@/components/teams/UnitEditor";
import PersonnelPool from "@/components/teams/PersonnelPool";
import CreateUnitModal from "@/components/teams/CreateUnitModal";
import { useCrew } from "@/lib/crew-store";

export default function TeamsPage() {
  const { state } = useCrew();
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Default-select the first unit so the editor isn't empty on first visit
  useEffect(() => {
    if (!selected) {
      const first = Object.keys(state.units).sort()[0];
      if (first) setSelected(first);
    }
  }, [state.units, selected]);

  const totalOnDuty = Object.values(state.units).reduce((n, u) => n + 1 + u.members.length, 0);
  const customCount = Object.values(state.units).filter((u) => u.isCustom).length;

  return (
    <div
      className="h-screen w-screen overflow-hidden grid"
      style={{
        gridTemplateRows: "52px 1fr",
        gridTemplateColumns: "56px 320px 1fr 360px",
      }}
    >
      {/* Nav rail — spans all rows */}
      <div className="row-span-2"><NavRail /></div>

      {/* Header — spans 3 remaining cols */}
      <header className="col-span-3 flex items-center justify-between px-5 glass-strip glass-divider-b">
        <BrandMark showWord hideMark subtitle="Crew Management" />

        <div className="flex items-center gap-2">
          <Tile icon={Activity} label="units" value={Object.keys(state.units).length} accent="#e4e4e7" />
          <Tile icon={Users} label="on duty" value={totalOnDuty} accent="#22c55e" />
          <Tile icon={Radio} label="pool" value={state.pool.length} accent="#eab308" />
          <Tile icon={Users} label="custom" value={customCount} accent="#a855f7" />
        </div>

        <div className="text-[10px]" style={{ color: "#71717a" }}>
          Changes save automatically to this browser
        </div>
      </header>

      {/* Left — unit list */}
      <aside className="glass glass-divider-r flex flex-col overflow-hidden min-h-0">
        <UnitList selected={selected} onSelect={setSelected} onNew={() => setShowNew(true)} />
      </aside>

      {/* Center — unit editor */}
      <main className="flex flex-col overflow-hidden min-h-0">
        <UnitEditor callSign={selected} />
      </main>

      {/* Right — personnel pool */}
      <aside className="glass glass-divider-l flex flex-col overflow-hidden min-h-0">
        <PersonnelPool targetUnit={selected} />
      </aside>

      <CreateUnitModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(name) => setSelected(name)}
      />
    </div>
  );
}

function Tile({
  icon: Icon, label, value, accent,
}: { icon: typeof Activity; label: string; value: number; accent: string }) {
  return (
    <div className="glass-card flex items-center gap-2 rounded-md px-3 py-1.5">
      <Icon size={12} style={{ color: accent }} />
      <span className="text-[12px] font-semibold tabular-nums" style={{ color: accent }}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "#6a6a72" }}>{label}</span>
    </div>
  );
}
