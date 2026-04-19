"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import IncidentFeed from "./IncidentFeed";
import IncidentDetail from "./IncidentDetail";
import LiveMap from "./LiveMap";
import NewIncidentModal from "./NewIncidentModal";

export default function DashboardShell() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  return (
    <div className="flex h-full">
      {/* Left: Incident Feed */}
      <div className="w-80 shrink-0 overflow-auto border-r border-[#1a1a1e]">
        <div className="flex items-center justify-between border-b border-[#1a1a1e] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">
            Incidents
          </h2>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1 rounded-md bg-[#ff2d2d] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#e02525]"
          >
            <Plus size={14} />
            New
          </button>
        </div>
        <IncidentFeed onSelect={setSelectedId} selectedId={selectedId} />
      </div>

      {/* Center: Live Map */}
      <div className="flex-1">
        <LiveMap onIncidentClick={setSelectedId} />
      </div>

      {/* Right: Detail Pane */}
      {selectedId && (
        <div className="w-96 shrink-0 border-l border-[#1a1a1e] overflow-auto">
          <IncidentDetail
            incidentId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}

      {/* New Incident Modal */}
      <NewIncidentModal
        isOpen={showNewForm}
        onClose={() => setShowNewForm(false)}
        onCreated={(id) => {
          setShowNewForm(false);
          setSelectedId(id);
        }}
      />
    </div>
  );
}
