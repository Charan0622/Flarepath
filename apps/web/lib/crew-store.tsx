"use client";

import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import { CREWS, type CrewMember, type CrewRoster } from "./crew-data";

const STORAGE_KEY = "flarepath.crew.v3";
const UNIT_TYPES = ["engine", "ladder", "tanker", "rescue", "ambulance", "custom"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];
export type Shift = "A" | "B" | "C";

export interface Unit extends Omit<CrewRoster, "captain" | "displayName"> {
  callSign: string;
  displayName: string;     // user-facing Indian-tradition name (Agni, Vayu, etc.)
  type: UnitType;
  station?: string;
  isCustom?: boolean;
  captain: CrewMember | null;
}

interface CrewState {
  units: Record<string, Unit>;
  pool: CrewMember[];
}

type Action =
  | { type: "ADD_MEMBER"; unit: string; member: CrewMember; fromPool?: boolean }
  | { type: "REMOVE_MEMBER"; unit: string; badge: string; toPool?: boolean }
  | { type: "PROMOTE_CAPTAIN"; unit: string; badge: string }
  | { type: "CREATE_UNIT"; unit: Unit }
  | { type: "DELETE_UNIT"; callSign: string }
  | { type: "RENAME_UNIT"; oldName: string; newName: string }
  | { type: "UPDATE_UNIT_META"; callSign: string; patch: Partial<Pick<Unit, "radio_channel" | "shift" | "station" | "type">> }
  | { type: "ADD_TO_POOL"; member: CrewMember }
  | { type: "REMOVE_FROM_POOL"; badge: string }
  | { type: "RESET" }
  | { type: "HYDRATE"; state: CrewState };

const INITIAL_POOL: CrewMember[] = [
  { name: "Andre Whitaker", rank: "Firefighter", badge: "SJ-0511", years: 2 },
  { name: "Beatrice Hale", rank: "Firefighter/Paramedic", badge: "SJ-0523", years: 3, certifications: ["EMT-P"] },
  { name: "Camille Duarte", rank: "Firefighter", badge: "SJ-0548", years: 1 },
  { name: "Dmitri Kowalski", rank: "Engineer", badge: "SJ-0556", years: 8, certifications: ["Apparatus Operator"] },
  { name: "Ezra Montgomery", rank: "Firefighter", badge: "SJ-0571", years: 4, certifications: ["FF-II"] },
  { name: "Fiona Blackwood", rank: "Firefighter/Paramedic", badge: "SJ-0589", years: 6, certifications: ["EMT-P", "Rope Rescue"] },
  { name: "Grayson Okonkwo", rank: "Rescue Technician", badge: "SJ-0602", years: 9, certifications: ["USAR", "Swift Water"] },
  { name: "Hannah Iverson", rank: "Firefighter", badge: "SJ-0618", years: 2 },
  { name: "Ibrahim Sayed", rank: "Engineer", badge: "SJ-0634", years: 11, certifications: ["Apparatus Operator", "Aerial Ops"] },
  { name: "Julia Petrov", rank: "Captain", badge: "SJ-0641", years: 14, certifications: ["IC-300"] },
  { name: "Kenji Nakamura", rank: "Firefighter/Paramedic", badge: "SJ-0659", years: 5, certifications: ["EMT-P"] },
  { name: "Lucia Velasquez", rank: "Firefighter", badge: "SJ-0672", years: 3, certifications: ["Wildland-RT"] },
];

function seedUnits(): Record<string, Unit> {
  const out: Record<string, Unit> = {};
  const typeFor = (call: string): UnitType => {
    if (call.startsWith("Engine")) return "engine";
    if (call.startsWith("Ladder")) return "ladder";
    if (call.startsWith("Tanker")) return "tanker";
    if (call.startsWith("Rescue")) return "rescue";
    return "custom";
  };
  const stationFor = (call: string) => {
    const n = call.split(" ")[1];
    return n ? `SJFD Station ${n}` : undefined;
  };
  Object.entries(CREWS).forEach(([callSign, roster]) => {
    out[callSign] = {
      ...roster,
      callSign,
      type: typeFor(callSign),
      station: stationFor(callSign),
      isCustom: false,
    };
  });
  return out;
}

function initialState(): CrewState {
  return { units: seedUnits(), pool: [...INITIAL_POOL] };
}

function reducer(state: CrewState, action: Action): CrewState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "RESET":
      return initialState();

    case "ADD_MEMBER": {
      const u = state.units[action.unit];
      if (!u) return state;
      // Skip if already on that unit
      if (u.members.some((m) => m.badge === action.member.badge) || u.captain?.badge === action.member.badge) {
        return state;
      }
      const pool = action.fromPool ? state.pool.filter((p) => p.badge !== action.member.badge) : state.pool;
      return {
        ...state,
        units: {
          ...state.units,
          [action.unit]: { ...u, members: [...u.members, action.member] },
        },
        pool,
      };
    }

    case "REMOVE_MEMBER": {
      const u = state.units[action.unit];
      if (!u) return state;
      const removed = u.members.find((m) => m.badge === action.badge);
      if (!removed) return state;
      const nextMembers = u.members.filter((m) => m.badge !== action.badge);
      const pool = action.toPool && !state.pool.some((p) => p.badge === action.badge)
        ? [...state.pool, removed]
        : state.pool;
      return {
        ...state,
        units: { ...state.units, [action.unit]: { ...u, members: nextMembers } },
        pool,
      };
    }

    case "PROMOTE_CAPTAIN": {
      const u = state.units[action.unit];
      if (!u) return state;
      const target = u.members.find((m) => m.badge === action.badge);
      if (!target) return state;
      const demoted = u.captain ? [...u.members.filter((m) => m.badge !== action.badge), u.captain] : u.members.filter((m) => m.badge !== action.badge);
      return {
        ...state,
        units: {
          ...state.units,
          [action.unit]: { ...u, captain: { ...target, rank: "Captain" }, members: demoted },
        },
      };
    }

    case "CREATE_UNIT": {
      if (state.units[action.unit.callSign]) return state;
      return { ...state, units: { ...state.units, [action.unit.callSign]: action.unit } };
    }

    case "DELETE_UNIT": {
      const u = state.units[action.callSign];
      if (!u) return state;
      const { [action.callSign]: _removed, ...rest } = state.units;
      const returned = [u.captain, ...u.members].filter(Boolean) as CrewMember[];
      const existingBadges = new Set(state.pool.map((p) => p.badge));
      const pool = [...state.pool, ...returned.filter((m) => !existingBadges.has(m.badge))];
      return { units: rest, pool };
    }

    case "RENAME_UNIT": {
      if (action.oldName === action.newName) return state;
      const u = state.units[action.oldName];
      if (!u || state.units[action.newName]) return state;
      const { [action.oldName]: _old, ...rest } = state.units;
      return { ...state, units: { ...rest, [action.newName]: { ...u, callSign: action.newName } } };
    }

    case "UPDATE_UNIT_META": {
      const u = state.units[action.callSign];
      if (!u) return state;
      return { ...state, units: { ...state.units, [action.callSign]: { ...u, ...action.patch } } };
    }

    case "ADD_TO_POOL": {
      if (state.pool.some((p) => p.badge === action.member.badge)) return state;
      return { ...state, pool: [...state.pool, action.member] };
    }

    case "REMOVE_FROM_POOL":
      return { ...state, pool: state.pool.filter((p) => p.badge !== action.badge) };

    default:
      return state;
  }
}

interface CrewCtx {
  state: CrewState;
  addMember: (unit: string, member: CrewMember, fromPool?: boolean) => void;
  removeMember: (unit: string, badge: string, toPool?: boolean) => void;
  promoteCaptain: (unit: string, badge: string) => void;
  createUnit: (unit: Unit) => void;
  deleteUnit: (callSign: string) => void;
  renameUnit: (oldName: string, newName: string) => void;
  updateUnitMeta: (callSign: string, patch: Partial<Pick<Unit, "radio_channel" | "shift" | "station" | "type">>) => void;
  addToPool: (member: CrewMember) => void;
  removeFromPool: (badge: string) => void;
  reset: () => void;
}

const Ctx = createContext<CrewCtx | null>(null);

export function CrewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CrewState;
      if (parsed && typeof parsed === "object" && parsed.units && parsed.pool) {
        dispatch({ type: "HYDRATE", state: parsed });
      }
    } catch {}
  }, []);

  // Persist on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const value: CrewCtx = {
    state,
    addMember: (unit, member, fromPool) => dispatch({ type: "ADD_MEMBER", unit, member, fromPool }),
    removeMember: (unit, badge, toPool = true) => dispatch({ type: "REMOVE_MEMBER", unit, badge, toPool }),
    promoteCaptain: (unit, badge) => dispatch({ type: "PROMOTE_CAPTAIN", unit, badge }),
    createUnit: (unit) => dispatch({ type: "CREATE_UNIT", unit }),
    deleteUnit: (callSign) => dispatch({ type: "DELETE_UNIT", callSign }),
    renameUnit: (oldName, newName) => dispatch({ type: "RENAME_UNIT", oldName, newName }),
    updateUnitMeta: (callSign, patch) => dispatch({ type: "UPDATE_UNIT_META", callSign, patch }),
    addToPool: (member) => dispatch({ type: "ADD_TO_POOL", member }),
    removeFromPool: (badge) => dispatch({ type: "REMOVE_FROM_POOL", badge }),
    reset: () => dispatch({ type: "RESET" }),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCrew(): CrewCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCrew must be used within CrewProvider");
  return ctx;
}

export function useUnit(callSign: string | null | undefined): Unit | null {
  const { state } = useCrew();
  if (!callSign) return null;
  return state.units[callSign] ?? null;
}

export { UNIT_TYPES };
