"use client";

import {
  createContext, useContext, useEffect, useReducer, useState,
  type ReactNode,
} from "react";

// ── Types ──────────────────────────────────────────────────────────
export type MemberStatus = "en_route" | "on_scene" | "returning" | "available";
export type MemberPhase = "nominal" | "smoke" | "low_air" | "mayday";

export interface MemberMayday {
  location: string;
  assignment: string;
  air_pressure: string;
  resources: string;
  raised_at: string;
  resolved_at: string | null;
}

interface MemberState {
  dispatchId: string;
  badge: string | null;          // the member's own badge (who am I?)
  status: MemberStatus;
  smokeMode: boolean;
  thermalMode: boolean;
  acknowledgedOrderIds: string[];
  respondedParIds: string[];     // par initiated_at strings we've acked
  buddyBadge: string | null;
  checklistCompleted: Record<string, string>; // key → completed_at ISO
  mayday: MemberMayday | null;
  trail: { ts: string; kind: string; payload?: Record<string, unknown> }[];
}

type Action =
  | { type: "SET_STATUS"; status: MemberStatus }
  | { type: "SET_BADGE"; badge: string | null }
  | { type: "ACK_ORDER"; orderId: string }
  | { type: "ACK_PAR"; parId: string }
  | { type: "TOGGLE_SMOKE" }
  | { type: "TOGGLE_THERMAL" }
  | { type: "SET_BUDDY"; badge: string | null }
  | { type: "CHECK_OBJECTIVE"; key: string }
  | { type: "RAISE_MAYDAY"; m: MemberMayday }
  | { type: "RESOLVE_MAYDAY" }
  | { type: "TRAIL"; kind: string; payload?: Record<string, unknown> }
  | { type: "HYDRATE"; state: MemberState };

function emptyState(dispatchId: string): MemberState {
  return {
    dispatchId, badge: null, status: "en_route",
    smokeMode: false, thermalMode: false,
    acknowledgedOrderIds: [], respondedParIds: [],
    buddyBadge: null, checklistCompleted: {},
    mayday: null, trail: [],
  };
}

function reducer(state: MemberState, action: Action): MemberState {
  const now = () => new Date().toISOString();
  const log = (kind: string, payload?: Record<string, unknown>) => ({
    ...state, trail: [...state.trail, { ts: now(), kind, ...(payload ? { payload } : {}) }],
  });

  switch (action.type) {
    case "HYDRATE": return action.state;
    case "SET_STATUS": return { ...log("status_change", { to: action.status }), status: action.status };
    case "SET_BADGE": return { ...state, badge: action.badge };
    case "ACK_ORDER":
      if (state.acknowledgedOrderIds.includes(action.orderId)) return state;
      return { ...log("order_ack", { id: action.orderId }), acknowledgedOrderIds: [...state.acknowledgedOrderIds, action.orderId] };
    case "ACK_PAR":
      if (state.respondedParIds.includes(action.parId)) return state;
      return { ...log("par_ack", { id: action.parId }), respondedParIds: [...state.respondedParIds, action.parId] };
    case "TOGGLE_SMOKE":   return { ...log("smoke_mode", { on: !state.smokeMode }), smokeMode: !state.smokeMode };
    case "TOGGLE_THERMAL": return { ...log("thermal_mode", { on: !state.thermalMode }), thermalMode: !state.thermalMode };
    case "SET_BUDDY":      return { ...log("buddy_set", { badge: action.badge }), buddyBadge: action.badge };
    case "CHECK_OBJECTIVE": {
      if (state.checklistCompleted[action.key]) {
        const { [action.key]: _removed, ...rest } = state.checklistCompleted;
        return { ...log("objective_uncleared", { key: action.key }), checklistCompleted: rest };
      }
      return { ...log("objective", { key: action.key }), checklistCompleted: { ...state.checklistCompleted, [action.key]: now() } };
    }
    case "RAISE_MAYDAY":   return { ...log("mayday", action.m as unknown as Record<string, unknown>), mayday: action.m };
    case "RESOLVE_MAYDAY": return { ...log("mayday_resolved"), mayday: state.mayday ? { ...state.mayday, resolved_at: now() } : null };
    case "TRAIL":          return log(action.kind, action.payload);
    default: return state;
  }
}

interface MemberCtx {
  state: MemberState;
  setStatus: (s: MemberStatus) => void;
  setBadge: (b: string | null) => void;
  ackOrder: (id: string) => void;
  ackPAR: (id: string) => void;
  toggleSmoke: () => void;
  toggleThermal: () => void;
  setBuddy: (b: string | null) => void;
  checkObjective: (k: string) => void;
  raiseMayday: (m: MemberMayday) => void;
  resolveMayday: () => void;
  trail: (kind: string, payload?: Record<string, unknown>) => void;
}

const Ctx = createContext<MemberCtx | null>(null);
const key = (id: string) => `flarepath.member.${id}.v1`;

export function MemberProvider({ dispatchId, children }: { dispatchId: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, dispatchId, emptyState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(key(dispatchId));
      if (raw) dispatch({ type: "HYDRATE", state: JSON.parse(raw) as MemberState });
    } catch {}
  }, [dispatchId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(key(dispatchId), JSON.stringify(state)); } catch {}
  }, [dispatchId, state]);

  const ctx: MemberCtx = {
    state,
    setStatus: (s) => dispatch({ type: "SET_STATUS", status: s }),
    setBadge: (b) => dispatch({ type: "SET_BADGE", badge: b }),
    ackOrder: (id) => dispatch({ type: "ACK_ORDER", orderId: id }),
    ackPAR: (id) => dispatch({ type: "ACK_PAR", parId: id }),
    toggleSmoke: () => dispatch({ type: "TOGGLE_SMOKE" }),
    toggleThermal: () => dispatch({ type: "TOGGLE_THERMAL" }),
    setBuddy: (b) => dispatch({ type: "SET_BUDDY", badge: b }),
    checkObjective: (k) => dispatch({ type: "CHECK_OBJECTIVE", key: k }),
    raiseMayday: (m) => dispatch({ type: "RAISE_MAYDAY", m }),
    resolveMayday: () => dispatch({ type: "RESOLVE_MAYDAY" }),
    trail: (kind, payload) => dispatch({ type: "TRAIL", kind, payload }),
  };

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export function useMember(): MemberCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMember must be inside MemberProvider");
  return ctx;
}

// ── Chief-state mirror ────────────────────────────────────────────
// The member reads the chief's localStorage so their console updates live
// whenever the chief tab assigns/par/mayday in the same browser session.
// In production this would be a Supabase Realtime channel.
export interface ChiefMirror {
  orderAcknowledged: boolean;
  orderAckAt: string | null;
  assignments: { badge: string; task: string; position: string; assigned_at: string }[];
  parChecks: { initiated_at: string; responded: string[]; completed_at: string | null }[];
  mayday: { badge: string; name: string; location: string; raised_at: string; resolved_at: string | null } | null;
  timeline: { ts: string; kind: string; payload?: Record<string, unknown> }[];
}

const EMPTY_MIRROR: ChiefMirror = {
  orderAcknowledged: false, orderAckAt: null, assignments: [],
  parChecks: [], mayday: null, timeline: [],
};

export function useChiefMirror(dispatchId: string): ChiefMirror {
  const [mirror, setMirror] = useState<ChiefMirror>(EMPTY_MIRROR);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const chiefKey = `flarepath.chief.${dispatchId}.v1`;

    const read = () => {
      try {
        const raw = localStorage.getItem(chiefKey);
        if (!raw) { setMirror(EMPTY_MIRROR); return; }
        const parsed = JSON.parse(raw);
        setMirror({
          orderAcknowledged: !!parsed.orderAcknowledged,
          orderAckAt: parsed.orderAckAt ?? null,
          assignments: parsed.assignments ?? [],
          parChecks: parsed.parChecks ?? [],
          mayday: parsed.mayday ?? null,
          timeline: parsed.timeline ?? [],
        });
      } catch { setMirror(EMPTY_MIRROR); }
    };

    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === chiefKey) read();
    };
    window.addEventListener("storage", onStorage);
    // Cross-tab sync is free via 'storage'; same-tab we poll as a fallback
    // since localStorage writes don't fire in the originating tab. Skip the
    // poll when the tab is hidden to keep backgrounded HUDs off the CPU, and
    // read on visibility-regain so the user sees the latest on return.
    const id = setInterval(() => {
      if (document.visibilityState === "visible") read();
    }, 2000);
    const onVisible = () => { if (document.visibilityState === "visible") read(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [dispatchId]);

  return mirror;
}
