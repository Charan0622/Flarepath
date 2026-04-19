import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { createHash } from "crypto";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const TriageOutputSchema = z.object({
  predicted_type: z.enum(["structure_fire", "vehicle_fire", "wildfire", "medical", "hazmat", "rescue", "false_alarm", "other"]),
  predicted_severity: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  extracted_entities: z.object({
    people_trapped: z.number().optional(),
    floors: z.number().optional(),
    injuries: z.number().optional(),
    hazardous_materials: z.array(z.string()).optional(),
    structure_type: z.string().optional(),
    spread_risk: z.string().optional(),
  }).passthrough(),
  recommended_crew_size: z.number().int().min(1).max(20),
  recommended_vehicle_types: z.array(z.enum(["engine", "ladder", "tanker", "ambulance", "rescue"])),
  reasoning: z.string(),
});

export type TriageOutput = z.infer<typeof TriageOutputSchema>;

const SYSTEM_PROMPT = `You are an AI triage assistant for the San Jose Fire Department. Given an incident description, classify it and recommend resources.

Return ONLY valid JSON matching this schema:
{
  "predicted_type": "structure_fire" | "vehicle_fire" | "wildfire" | "medical" | "hazmat" | "rescue" | "false_alarm" | "other",
  "predicted_severity": "low" | "medium" | "high" | "critical",
  "confidence": 0.0 to 1.0,
  "extracted_entities": { "people_trapped": number?, "floors": number?, "injuries": number?, "hazardous_materials": string[]?, "structure_type": string?, "spread_risk": string? },
  "recommended_crew_size": 1-20,
  "recommended_vehicle_types": ["engine" | "ladder" | "tanker" | "ambulance" | "rescue"],
  "reasoning": "brief explanation"
}

Examples:
- "Kitchen fire 3rd floor apartment, 2 trapped" → critical, structure_fire, people_trapped:2, floors:3, crew:8, [engine, ladder, ambulance]
- "Smoke detector triggered by cooking" → low, false_alarm, crew:2, [engine]
- "Car on fire on highway, fuel leaking" → high, vehicle_fire, crew:4, [engine, tanker]
- "Chemical spill in factory, workers having difficulty breathing" → critical, hazmat, crew:10, [engine, rescue, ambulance]
- "Grass fire near houses, wind-driven" → high, wildfire, crew:6, [engine, tanker]
- "Child locked in car, 95°F" → high, rescue, crew:3, [rescue]
- "Transformer sparking, burning smell" → medium, hazmat, crew:4, [engine]
- "Gas explosion at restaurant, structural collapse" → critical, structure_fire, crew:12, [engine, ladder, rescue, ambulance]`;

export async function triageWithGemini(
  description: string,
  address: string,
  type: string,
  hazards: string[]
): Promise<{ output: TriageOutput; latency_ms: number; model: string; prompt_hash: string }> {
  const userPrompt = `Incident Report:
- Description: ${description}
- Address: ${address}
- Reported Type: ${type}
- Known Hazards: ${hazards.length > 0 ? hazards.join(", ") : "none reported"}

Classify this incident and recommend response resources. Return JSON only.`;

  const promptHash = createHash("md5").update(userPrompt).digest("hex").slice(0, 12);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const start = Date.now();

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const latency_ms = Date.now() - start;
  const text = result.response.text();

  // Parse and validate
  const parsed = JSON.parse(text);
  const validated = TriageOutputSchema.safeParse(parsed);

  if (validated.success) {
    return { output: validated.data, latency_ms, model: "gemini-1.5-flash", prompt_hash: promptHash };
  }

  // Retry once with error feedback
  const retryPrompt = `Your previous response failed validation: ${validated.error.issues.map(i => i.message).join("; ")}.
Please fix and return valid JSON only.

Original request:
${userPrompt}`;

  const retryStart = Date.now();
  const retryResult = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + retryPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });
  const retryLatency = Date.now() - retryStart;
  const retryText = retryResult.response.text();
  const retryParsed = JSON.parse(retryText);
  const retryValidated = TriageOutputSchema.safeParse(retryParsed);

  if (retryValidated.success) {
    return { output: retryValidated.data, latency_ms: latency_ms + retryLatency, model: "gemini-1.5-flash", prompt_hash: promptHash };
  }

  // Fall back to rule-based
  return {
    output: ruleBasedTriage(description, type, hazards),
    latency_ms: latency_ms + retryLatency,
    model: "rule-based-fallback",
    prompt_hash: promptHash,
  };
}

function ruleBasedTriage(description: string, type: string, hazards: string[]): TriageOutput {
  const lower = description.toLowerCase();
  const hasTrap = lower.includes("trapped") || lower.includes("stuck") || lower.includes("locked");
  const hasExplosion = lower.includes("explosion") || lower.includes("explod");
  const hasCollapse = lower.includes("collapse") || hazards.includes("structural_collapse");
  const hasChemical = lower.includes("chemical") || lower.includes("hazmat") || hazards.includes("chemical_fumes");

  let severity: TriageOutput["predicted_severity"] = "medium";
  let crewSize = 4;
  const vehicles: TriageOutput["recommended_vehicle_types"] = ["engine"];

  if (hasTrap || hasExplosion || hasCollapse) {
    severity = "critical";
    crewSize = 10;
    vehicles.push("ladder", "rescue", "ambulance");
  } else if (hasChemical) {
    severity = "high";
    crewSize = 6;
    vehicles.push("rescue");
  } else if (type === "false_alarm") {
    severity = "low";
    crewSize = 2;
  } else if (type === "wildfire") {
    severity = "high";
    crewSize = 6;
    vehicles.push("tanker");
  }

  return {
    predicted_type: type as TriageOutput["predicted_type"],
    predicted_severity: severity,
    confidence: 0.5,
    extracted_entities: {
      people_trapped: hasTrap ? 1 : undefined,
    },
    recommended_crew_size: crewSize,
    recommended_vehicle_types: vehicles,
    reasoning: "Classified by rule-based fallback (AI unavailable or validation failed).",
  };
}
