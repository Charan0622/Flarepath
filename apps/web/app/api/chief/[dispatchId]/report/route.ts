import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthenticatedUser, getServiceClient } from "@/lib/supabase/api";

interface TimelineEvent { ts: string; kind: string; payload: Record<string, unknown> }
interface ChiefReportPayload {
  timeline: TimelineEvent[];
  crew: { name: string; rank: string; badge: string; years: number; role: "captain" | "member" }[];
  sizeUp: Record<string, string>;
  benchmarks: { key: string; completed_at: string | null }[];
  assignments: { badge: string; task: string; position: string; assigned_at: string }[];
  waterSupply: { source: string | null; gpm: number; residual_psi: number };
  mayday: { name: string; location: string; raised_at: string; resolved_at: string | null } | null;
}

async function generateNarrative(input: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "AI narrative unavailable — configure GEMINI_API_KEY to enable automated post-incident prose.";
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const res = await model.generateContent(input);
    return res.response.text().trim();
  } catch (e) {
    return `AI narrative generation failed (${(e as Error).message}). Raw timeline data is included below.`;
  }
}

export async function POST(req: NextRequest, { params }: { params: { dispatchId: string } }) {
  const auth = await getAuthenticatedUser();
  if (!auth) return new NextResponse("Unauthorized", { status: 401 });

  const payload = (await req.json()) as ChiefReportPayload;
  const db = getServiceClient();

  const { data: dispatch } = await db.from("dispatches").select("*").eq("id", params.dispatchId).single();
  if (!dispatch) return new NextResponse("Dispatch not found", { status: 404 });

  const [incidentRes, vehicleRes, triageRes] = await Promise.all([
    db.from("incidents").select("*").eq("id", dispatch.incident_id).single(),
    db.from("vehicles").select("*").eq("id", dispatch.vehicle_id).single(),
    db.from("ai_triage").select("*").eq("incident_id", dispatch.incident_id).maybeSingle(),
  ]);

  const incident = incidentRes.data;
  const vehicle = vehicleRes.data;
  const triage = triageRes.data;
  if (!incident || !vehicle) return new NextResponse("Missing incident/vehicle", { status: 404 });

  // Build a narrative prompt that gives Gemini everything it needs
  const responseTime = dispatch.on_scene_at && dispatch.assigned_at
    ? Math.round((new Date(dispatch.on_scene_at).getTime() - new Date(dispatch.assigned_at).getTime()) / 1000)
    : null;

  const prompt = `You are writing a formal post-incident report for the San Jose Fire Department. Produce a single 3-5 paragraph professional narrative, ~200-320 words, suitable for an ICS-201 report. Write in past tense, third person, active voice. Be factual and precise. DO NOT invent details not present in the data. Do not use markdown — plain prose only.

Cover in order:
1) Arrival and initial size-up (what the chief found on each side A/B/C/D when marked)
2) Tactical operations (who did what: captain, crew assignments, tasks completed per benchmark timestamps)
3) Safety events (PAR calls, Mayday if any, fatigue indicators)
4) Resolution (water supply established, benchmarks closed, units returned)
5) Lessons learned or notable observations (one sentence)

## INCIDENT
- Type: ${incident.type.replace(/_/g, " ")}
- Severity: ${incident.severity}
- Address: ${incident.address}
- Reported: ${new Date(incident.created_at).toLocaleString()}
- Description: ${incident.description ?? "n/a"}
- Hazards flagged: ${(incident.hazards ?? []).join(", ") || "none"}

## RESPONDING UNIT
- Call sign: ${vehicle.call_sign} (${vehicle.type})
- Dispatched at: ${dispatch.assigned_at}
- On-scene at: ${dispatch.on_scene_at ?? "n/a"}
- Travel time: ${responseTime !== null ? `${Math.floor(responseTime / 60)}m ${responseTime % 60}s` : "n/a"}

## CREW (${payload.crew.length})
${payload.crew.map((c) => `- ${c.role === "captain" ? "CAPT " : "    "}${c.name} (${c.rank}, badge ${c.badge}, ${c.years}y)`).join("\n")}

## SIZE-UP (4 sides)
${Object.entries(payload.sizeUp).map(([side, state]) => `- Side ${side}: ${state}`).join("\n")}

## ASSIGNMENTS (who did what)
${payload.assignments.length > 0
  ? payload.assignments.map((a) => {
      const who = payload.crew.find((c) => c.badge === a.badge);
      return `- ${who?.name ?? a.badge}: ${a.task.replace(/_/g, " ")} (${a.position.toUpperCase()}) at ${new Date(a.assigned_at).toLocaleTimeString()}`;
    }).join("\n")
  : "- (no assignments logged)"}

## BENCHMARKS (timestamped checkpoints)
${payload.benchmarks.length > 0
  ? payload.benchmarks.filter((b) => b.completed_at).map((b) => `- ${b.key.replace(/_/g, " ")}: ${new Date(b.completed_at!).toLocaleTimeString()}`).join("\n") || "- (none completed)"
  : "- (none completed)"}

## WATER SUPPLY
- Source: ${payload.waterSupply.source ?? "not established"}
- Flow: ${payload.waterSupply.gpm} GPM
- Residual: ${payload.waterSupply.residual_psi} PSI

## MAYDAY
${payload.mayday ? `- ${payload.mayday.name} at ${payload.mayday.location}, raised ${payload.mayday.raised_at}${payload.mayday.resolved_at ? `, resolved ${payload.mayday.resolved_at}` : " (unresolved)"}` : "- none"}

## AI TRIAGE (pre-arrival intel)
${triage ? `- Model ${triage.model} · confidence ${Math.round((triage.confidence ?? 0) * 100)}%\n- Reasoning: ${triage.reasoning}` : "- not available"}

Write only the narrative.`;

  const narrative = await generateNarrative(prompt);

  // Render a print-ready HTML document
  const severityColor: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>ICS-201 Report · ${incident.id.slice(0, 8)}</title>
<style>
  :root { --accent: ${severityColor[incident.severity] ?? "#71717a"}; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif; max-width: 840px; margin: 0 auto; padding: 48px 56px; color: #1f2937; line-height: 1.5; background: #fff; }
  header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid var(--accent); padding-bottom: 16px; margin-bottom: 24px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-mark { width: 34px; height: 34px; border-radius: 8px; background: linear-gradient(135deg, #ef4444, #991b1b); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 14px; }
  .brand-name { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
  .brand-sub { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: #6b7280; margin-top: 2px; }
  .rpt-meta { text-align: right; font-size: 10px; color: #6b7280; }
  h1 { font-size: 24px; margin: 0 0 4px 0; letter-spacing: -0.02em; }
  .sub { font-size: 12px; color: #6b7280; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }
  .sev-${incident.severity} { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); }
  section { margin-top: 28px; }
  section h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #6b7280; margin: 0 0 10px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px 24px; font-size: 12px; }
  .meta .k { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; }
  .meta .v { font-weight: 600; color: #111827; }
  .narrative { font-size: 13px; line-height: 1.7; color: #1f2937; }
  .narrative p { margin: 0 0 12px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
  th { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; background: #f9fafb; }
  td { color: #1f2937; }
  td.mono { font-family: "JetBrains Mono", "SF Mono", ui-monospace, monospace; font-size: 10px; color: #6b7280; }
  .pill { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .pill-green { background: #dcfce7; color: #14532d; }
  .pill-red { background: #fee2e2; color: #991b1b; }
  .pill-orange { background: #ffedd5; color: #9a3412; }
  .pill-blue { background: #dbeafe; color: #1e3a8a; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #9ca3af; text-align: center; letter-spacing: 0.08em; text-transform: uppercase; }
  @media print { body { padding: 36px 44px; } header { page-break-after: avoid; } section { page-break-inside: avoid; } }
  .print-prompt { position: fixed; bottom: 16px; right: 16px; padding: 10px 14px; background: #1f2937; color: #fff; font-size: 12px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
  @media print { .print-prompt { display: none; } }
  .print-btn { background: #ef4444; border: 0; color: #fff; font-weight: 600; padding: 6px 12px; border-radius: 4px; margin-left: 8px; cursor: pointer; font-size: 11px; }
</style>
</head><body>

<header>
  <div class="brand">
    <div class="brand-mark">F</div>
    <div>
      <div class="brand-name">Flarepath</div>
      <div class="brand-sub">ICS-201 Post-Incident Report</div>
    </div>
  </div>
  <div class="rpt-meta">
    Report ID: <strong>${incident.id.slice(0, 8).toUpperCase()}</strong><br>
    Generated: ${new Date().toLocaleString()}<br>
    Dispatch: <span class="mono">${dispatch.id.slice(0, 8)}</span>
  </div>
</header>

<h1>${incident.type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} — ${incident.address.split(",")[0]}</h1>
<div class="sub">${incident.address} · <span class="badge sev-${incident.severity}">${incident.severity}</span></div>

<section>
  <h2>Incident details</h2>
  <div class="meta">
    <div><div class="k">Reported at</div><div class="v">${new Date(incident.created_at).toLocaleString()}</div></div>
    <div><div class="k">Dispatched at</div><div class="v">${dispatch.assigned_at ? new Date(dispatch.assigned_at).toLocaleString() : "—"}</div></div>
    <div><div class="k">On scene</div><div class="v">${dispatch.on_scene_at ? new Date(dispatch.on_scene_at).toLocaleString() : "—"}</div></div>
    <div><div class="k">Travel time</div><div class="v">${responseTime !== null ? `${Math.floor(responseTime / 60)}m ${responseTime % 60}s` : "—"}</div></div>
    <div><div class="k">Distance</div><div class="v">${dispatch.distance_m ? `${(dispatch.distance_m / 1000).toFixed(1)} km` : "—"}</div></div>
    <div><div class="k">Reporter</div><div class="v">${incident.reporter_name ?? "—"}</div></div>
    <div><div class="k">Responding unit</div><div class="v">${vehicle.call_sign}</div></div>
    <div><div class="k">Hazards flagged</div><div class="v">${(incident.hazards ?? []).join(", ") || "none"}</div></div>
  </div>
</section>

<section>
  <h2>AI-generated narrative</h2>
  <div class="narrative">
    ${narrative.split(/\n\n+/).map((p: string) => `<p>${escapeHtml(p)}</p>`).join("")}
  </div>
</section>

<section>
  <h2>Crew roster (${payload.crew.length})</h2>
  <table>
    <thead><tr><th>Member</th><th>Rank</th><th>Role</th><th>Badge</th><th>Years</th></tr></thead>
    <tbody>
      ${payload.crew.map((c) => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.rank}</td>
          <td>${c.role === "captain" ? '<span class="pill pill-orange">Captain</span>' : '<span class="pill pill-blue">Crew</span>'}</td>
          <td class="mono">${c.badge}</td>
          <td>${c.years}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
</section>

<section>
  <h2>Tactical assignments (who did what)</h2>
  ${payload.assignments.length === 0
    ? `<div class="sub">No explicit assignments were logged during this incident.</div>`
    : `<table>
        <thead><tr><th>Member</th><th>Task</th><th>ICS position</th><th>Assigned at</th></tr></thead>
        <tbody>
          ${payload.assignments.map((a) => {
            const who = payload.crew.find((c) => c.badge === a.badge);
            return `<tr>
              <td><strong>${who?.name ?? a.badge}</strong></td>
              <td>${a.task.replace(/_/g, " ")}</td>
              <td>${a.position.toUpperCase()}</td>
              <td class="mono">${new Date(a.assigned_at).toLocaleTimeString()}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`}
</section>

<div class="grid-2">
  <section>
    <h2>360° size-up</h2>
    <table>
      <thead><tr><th>Side</th><th>Observation</th></tr></thead>
      <tbody>
        ${["A", "B", "C", "D"].map((s) => `<tr><td><strong>Side ${s}</strong></td><td>${payload.sizeUp[s] ?? "unknown"}</td></tr>`).join("")}
      </tbody>
    </table>
  </section>
  <section>
    <h2>Water supply</h2>
    <div class="meta" style="grid-template-columns: 1fr 1fr;">
      <div><div class="k">Source</div><div class="v">${payload.waterSupply.source ?? "not established"}</div></div>
      <div><div class="k">Flow</div><div class="v">${payload.waterSupply.gpm} GPM</div></div>
      <div><div class="k">Residual</div><div class="v">${payload.waterSupply.residual_psi} PSI</div></div>
    </div>
  </section>
</div>

<section>
  <h2>ICS benchmarks</h2>
  <table>
    <thead><tr><th>Checkpoint</th><th>Status</th><th>Completed at</th></tr></thead>
    <tbody>
      ${payload.benchmarks.map((b) => `
        <tr>
          <td>${b.key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</td>
          <td>${b.completed_at ? '<span class="pill pill-green">Complete</span>' : '<span class="pill pill-orange">Pending</span>'}</td>
          <td class="mono">${b.completed_at ? new Date(b.completed_at).toLocaleTimeString() : "—"}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
</section>

${payload.mayday ? `
<section>
  <h2>Mayday event</h2>
  <div class="meta">
    <div><div class="k">Firefighter</div><div class="v">${payload.mayday.name}</div></div>
    <div><div class="k">Location</div><div class="v">${payload.mayday.location}</div></div>
    <div><div class="k">Status</div><div class="v">${payload.mayday.resolved_at ? '<span class="pill pill-green">Resolved</span>' : '<span class="pill pill-red">Unresolved</span>'}</div></div>
    <div><div class="k">Raised</div><div class="v">${new Date(payload.mayday.raised_at).toLocaleTimeString()}</div></div>
    ${payload.mayday.resolved_at ? `<div><div class="k">Resolved</div><div class="v">${new Date(payload.mayday.resolved_at).toLocaleTimeString()}</div></div>` : ""}
  </div>
</section>
` : ""}

<section>
  <h2>Event timeline (${payload.timeline.length})</h2>
  ${payload.timeline.length === 0
    ? `<div class="sub">No events were logged during this incident.</div>`
    : `<table>
        <thead><tr><th>Time</th><th>Event</th><th>Detail</th></tr></thead>
        <tbody>
          ${[...payload.timeline].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()).map((e) => `
            <tr>
              <td class="mono">${new Date(e.ts).toLocaleTimeString()}</td>
              <td>${escapeHtml(e.kind.replace(/_/g, " "))}</td>
              <td class="mono">${escapeHtml(describe(e.kind, e.payload))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>`}
</section>

<footer>
  Flarepath · AI-assisted fire dispatch platform · San Jose Fire Department<br>
  This report is generated from the chief's on-scene command timeline and validated dispatch data.
</footer>

<div class="print-prompt">
  Review and print to save as PDF
  <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
</div>

<script>
  // Auto-prompt print when loaded, but let the user cancel.
  setTimeout(() => window.print(), 400);
</script>

</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function describe(kind: string, payload: Record<string, unknown>): string {
  if (kind === "benchmark") return String(payload.key).replace(/_/g, " ");
  if (kind === "size_up") return `Side ${payload.side} → ${payload.state}`;
  if (kind === "assignment") return `${payload.badge} → ${String(payload.task).replace(/_/g, " ")} (${String(payload.position).toUpperCase()})`;
  if (kind === "water_supply") return Object.entries(payload).map(([k, v]) => `${k}=${v}`).join(" · ");
  if (kind === "mayday_raised") return `${payload.name} · ${payload.location}`;
  if (kind === "par_complete") return `${payload.responded} responded`;
  if (kind === "order_acknowledged") return "order ack'd";
  return "";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
