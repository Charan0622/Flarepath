"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Flame, Map, Radio, Plus } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNewIncident: () => void;
  onNavigate: (path: string) => void;
}

const COMMANDS = [
  { id: "new", label: "New Incident", icon: Plus, shortcut: "N" },
  { id: "incidents", label: "View Incidents", icon: Flame, shortcut: "" },
  { id: "map", label: "Live Map", icon: Map, shortcut: "" },
  { id: "dispatch", label: "Dispatch", icon: Radio, shortcut: "" },
];

export default function CommandPalette({ isOpen, onClose, onNewIncident, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  function execute(id: string) {
    onClose();
    switch (id) {
      case "new": onNewIncident(); break;
      case "incidents": onNavigate("/"); break;
      case "map": onNavigate("/map"); break;
      case "dispatch": onNavigate("/dispatch"); break;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-[#1a1a1e] bg-[#0a0a0b] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[#1a1a1e] px-4 py-3">
          <Search size={16} className="text-[#555]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-white placeholder-[#555] outline-none"
          />
          <kbd className="rounded border border-[#333] px-1.5 py-0.5 text-[10px] text-[#555]">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-[#555]">No results</p>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => execute(cmd.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[#ccc] hover:bg-[#1a1a1e]"
              >
                <cmd.icon size={16} className="text-[#888]" />
                <span className="flex-1">{cmd.label}</span>
                {cmd.shortcut && (
                  <kbd className="rounded border border-[#333] px-1.5 py-0.5 text-[10px] text-[#555]">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
