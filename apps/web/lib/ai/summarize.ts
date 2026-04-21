import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

function getGenAI(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenerativeAI(key);
}

const SummarySchema = z.object({
  summary: z.string(),
  cause: z.string().optional(),
  response_time_assessment: z.string(),
  key_actions: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const SUMMARY_PROMPT = `You are a fire department report writer. Given incident data, generate a professional post-incident summary.

Return ONLY valid JSON:
{
  "summary": "3-paragraph incident summary covering what happened, response, and outcome",
  "cause": "probable cause if determinable, or null",
  "response_time_assessment": "brief assessment of response efficiency",
  "key_actions": ["list of key actions taken"],
  "recommendations": ["lessons learned or improvements"]
}`;

export async function generateIncidentSummary(incident: Record<string, unknown>): Promise<z.infer<typeof SummarySchema>> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-1.5-flash" });

  const incidentData = `
Type: ${incident.type}
Severity: ${incident.severity}
Address: ${incident.address}
Description: ${incident.description}
Hazards: ${(incident.hazards as string[])?.join(", ") || "none"}
Status: ${incident.status}
Reported at: ${incident.reported_at}
Created at: ${incident.created_at}`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: `${SUMMARY_PROMPT}\n\nIncident Data:\n${incidentData}` }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const text = result.response.text();
  const parsed = JSON.parse(text);
  const validated = SummarySchema.safeParse(parsed);

  if (validated.success) return validated.data;

  return {
    summary: `Incident at ${incident.address}. Type: ${incident.type}, Severity: ${incident.severity}. Status: ${incident.status}.`,
    response_time_assessment: "Unable to assess automatically.",
    key_actions: [],
    recommendations: [],
  };
}
