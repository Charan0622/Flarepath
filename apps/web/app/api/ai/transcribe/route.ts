import "server-only";

import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { apiSuccess, apiError } from "@/lib/api-response";

// POST /api/ai/transcribe — audio → text via Groq Whisper
export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return apiError("Transcription is not configured on this deployment.", 503);
  }
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const formData = await request.formData();
  const audioFile = formData.get("audio") as File | null;

  if (!audioFile) {
    return apiError("No audio file provided. Send as multipart/form-data with field 'audio'.", 400);
  }

  const start = Date.now();

  const transcription = await groq.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-large-v3",
    response_format: "json",
    language: "en",
  });

  const latency_ms = Date.now() - start;

  return apiSuccess({
    text: transcription.text,
    model: "whisper-large-v3",
    latency_ms,
  });
}
