"use client";

import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import type { BenchmarkKey, BuildingSide, SideState, TaskKey, IcsPosition } from "./chief-data";

// Chief-side operational state per dispatch. Persisted to localStorage
// because the incident commander's scratch state doesn't need to survive
// in Postgres — the timeline generator reads the final snapshot on close.

export interface SizeUp { A: SideState; B: SideState; C: SideState; D: SideState }
export interface Benchmark { key: BenchmarkKey; completed_at: string | null }
export interface Assignment { badge: string; task: TaskKey; position: IcsPosition; assigned_at: string }
export interface WaterSupply { source: "hydrant" | "tanker" | "draft" | null; gpm: number; residual_psi: number }
export interface ParCheck { initiated_at: string; responded: string[]; completed_at: string | null }

export interface Mayday {
  badge: string;
  name: string;
  location: string;
  unit: string;
  assignment: string;
  air_pressure: string;
  resources: string;
  raised_at: string;
  resolved_at: string | null;
}

interface ChiefState {
  dispatchId: string;
  orderAcknowledged: boolean;
  orderAckAt: string | null;
  sizeUp: SizeUp;
  benchmarks: Benchmark[];
  assignments: Assignment[];
  waterSupply: WaterSupply;
  parChecks: ParCheck[];
  mayday: Mayday | null;
  timeline: { ts: string; kind: string; payload: Record<string, unknown> }[];
}

type Action =
  | { type: "ACK_ORDER" }
  | { type: "SET_SIDE"; side: BuildingSide; state: SideState }
  | { type: "TOGGLE_BENCHMARK"; key: BenchmarkKey }
  | { type: "ASSIGN"; assignment: Assignment }
  | { type: "UNASSIGN"; badge: string }
  | { type: "UPDATE_WATER"; patch: Partial<WaterSupply> }
  | { type: "START_PAR" }
  | { type: "PAR_RESPOND"; badge: string }
  | { type: "COMPLETE_PAR" }
  | { type: "RAISE_MAYDAY"; mayday: Mayday }
  | { type: "RESOLVE_MAYDAY" }
  | { type: "HYDRATE"; state: ChiefState };

function emptyState(dispatchId: string): ChiefState {
  return {
    dispatchId,
    orderAcknowledged: false,
    orderAckAt: null,
    sizeUp: { A: "unknown", B: "unknown", C: "unknown", D: "unknown" },
    benchmarks: [],
    assignments: [],
    waterSupply: { source: null, gpm: 0, residual_psi: 0 },
    parChecks: [],
    mayday: null,
    timeline: [],
  };
}

function now(): string { return new Date().toISOString(); }
function log(state: ChiefState, kind: string, payload: Record<string, unknown> = {}): ChiefState {
  return { ...state, timeline: [...state.timeline, { ts: now(), kind, payload }] };
}

function reducer(state: ChiefState, action: Action): ChiefState {
  switch (action.type) {
    case "HYDRATE": return action.state;

    case "ACK_ORDER": {
      if (state.orderAcknowledged) return state;
      const ack = now();
      return log({ ...state, orderAcknowledged: true, orderAckAt: ack }, "order_acknowledged", { at: ack });
    }

    case "SET_SIDE": {
      const next = { ...state.sizeUp, [action.side]: action.state };
      return log({ ...state, sizeUp: next }, "size_up", { side: action.side, state: action.state });
    }

    case "TOGGLE_BENCHMARK": {
      const existing = state.benchmarks.find((b) => b.key === action.key);
      if (existing && existing.completed_at) {
        // un-complete
        return log({ ...state, benchmarks: state.benchmarks.filter((b) => b.key !== action.key) }, "benchmark_uncleared", { key: action.key });
      }
      const completed_at = now();
      const next = [...state.benchmarks.filter((b) => b.key !== action.key), { key: action.key, completed_at }];
      return log({ ...state, benchmarks: next }, "benchmark", { key: action.key, completed_at });
    }

    case "ASSIGN": {
      const filtered = state.assignments.filter((a) => a.badge !== action.assignment.badge);
      return log({ ...state, assignments: [...filtered, action.assignment] }, "assignment", action.assignment as unknown as Record<string, unknown>);
    }

    case "UNASSIGN":
      return log({ ...state, assignments: state.assignments.filter((a) => a.badge !== action.badge) }, "unassigned", { badge: action.badge });

    case "UPDATE_WATER":
      return log({ ...state, waterSupply: { ...state.waterSupply, ...action.patch } }, "water_supply", action.patch as Record<string, unknown>);

    case "START_PAR":
      return log({ ...state, parChecks: [...state.parChecks, { initiated_at: now(), responded: [], completed_at: null }] }, "par_initiated", {});

    case "PAR_RESPOND": {
      if (state.parChecks.length === 0) return state;
      const last = state.parChecks[state.parChecks.length - 1];
      if (last.completed_at) return state;
      if (last.responded.includes(action.badge)) return state;
      const updated = { ...last, responded: [...last.responded, action.badge] };
      return { ...state, parChecks: [...state.parChecks.slice(0, -1), updated] };
    }

    case "COMPLETE_PAR": {
      if (state.parChecks.length === 0) return state;
      const last = state.parChecks[state.parChecks.length - 1];
      if (last.completed_at) return state;
      const updated = { ...last, completed_at: now() };
      return log({ ...state, parChecks: [...state.parChecks.slice(0, -1), updated] }, "par_complete", { responded: last.responded.length });
    }

    case "RAISE_MAYDAY":
      return log({ ...state, mayday: action.mayday }, "mayday_raised", action.mayday as unknown as Record<string, unknown>);

    case "RESOLVE_MAYDAY":
      return log({ ...state, mayday: state.mayday ? { ...state.mayday, resolved_at: now() } : null }, "mayday_resolved", {});

    default: return state;
  }
}

interface ChiefCtx {
  state: ChiefState;
  ackOrder: () => void;
  setSide: (side: BuildingSide, state: SideState) => void;
  toggleBenchmark: (key: BenchmarkKey) => void;
  assign: (badge: string, task: TaskKey, position: IcsPosition) => void;
  unassign: (badge: string) => void;
  updateWater: (patch: Partial<WaterSupply>) => void;
  startPar: () => void;
  parRespond: (badge: string) => void;
  completePar: () => void;
  raiseMayday: (m: Mayday) => void;
  resolveMayday: () => void;
}

const Ctx = createContext<ChiefCtx | null>(null);
const key = (id: string) => `flarepath.chief.${id}.v1`;

export function ChiefProvider({ dispatchId, children }: { dispatchId: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, dispatchId, emptyState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(key(dispatchId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChiefState;
      if (parsed && parsed.dispatchId === dispatchId) dispatch({ type: "HYDRATE", state: parsed });
    } catch {}
  }, [dispatchId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(key(dispatchId), JSON.stringify(state)); } catch {}
  }, [dispatchId, state]);

  const ctx: ChiefCtx = {
    state,
    ackOrder: () => dispatch({ type: "ACK_ORDER" }),
    setSide: (side, st) => dispatch({ type: "SET_SIDE", side, state: st }),
    toggleBenchmark: (k) => dispatch({ type: "TOGGLE_BENCHMARK", key: k }),
    assign: (badge, task, position) => dispatch({ type: "ASSIGN", assignment: { badge, task, position, assigned_at: now() } }),
    unassign: (badge) => dispatch({ type: "UNASSIGN", badge }),
    updateWater: (patch) => dispatch({ type: "UPDATE_WATER", patch }),
    startPar: () => dispatch({ type: "START_PAR" }),
    parRespond: (badge) => dispatch({ type: "PAR_RESPOND", badge }),
    completePar: () => dispatch({ type: "COMPLETE_PAR" }),
    raiseMayday: (m) => dispatch({ type: "RAISE_MAYDAY", mayday: m }),
    resolveMayday: () => dispatch({ type: "RESOLVE_MAYDAY" }),
  };

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export function useChief(): ChiefCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useChief must be used inside ChiefProvider");
  return ctx;
}
