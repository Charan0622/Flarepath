import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

function getGenAI(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenerativeAI(key);
}

export const IncidentExtractSchema = z.object({
  reporter_name: z.string().optional(),
  reporter_phone: z.string().optional(),
  address: z.string().optional(),
  type: z.enum(["structure_fire", "vehicle_fire", "wildfire", "medical", "hazmat", "rescue", "false_alarm", "other"]).optional(),
  description: z.string(),
  hazards: z.array(z.string()).default([]),
});

export type IncidentExtract = z.infer<typeof IncidentExtractSchema>;

const EXTRACT_PROMPT = `You are a fire department dispatch assistant. Extract structured incident information from this dispatcher's spoken report.

Return ONLY valid JSON matching this schema:
{
  "reporter_name": "string or null",
  "reporter_phone": "string or null",
  "address": "street address or null",
  "type": "structure_fire" | "vehicle_fire" | "wildfire" | "medical" | "hazmat" | "rescue" | "false_alarm" | "other",
  "description": "cleaned-up version of what was said",
  "hazards": ["trapped_occupants", "gas_leak", "electrical", etc.]
}

If information is not mentioned, omit that field. Always include description.`;

export async function extractIncidentFromTranscript(transcript: string): Promise<IncidentExtract> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: `${EXTRACT_PROMPT}\n\nTranscript: "${transcript}"` }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const text = result.response.text();
  const parsed = JSON.parse(text);
  const validated = IncidentExtractSchema.safeParse(parsed);

  if (validated.success) return validated.data;

  // Fallback: just use transcript as description
  return { description: transcript, hazards: [] };
}
