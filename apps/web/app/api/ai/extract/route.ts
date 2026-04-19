import "server-only";

import { NextRequest } from "next/server";
import { z } from "zod";
import { extractIncidentFromTranscript } from "@/lib/ai/extract";
import { apiSuccess, apiError } from "@/lib/api-response";

const ExtractRequestSchema = z.object({
  transcript: z.string().min(1),
});

// POST /api/ai/extract — extract structured incident data from transcript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = ExtractRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  const extracted = await extractIncidentFromTranscript(parsed.data.transcript);
  return apiSuccess(extracted);
}
