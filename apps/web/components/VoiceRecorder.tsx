"use client";

import { useState, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface Props {
  onTranscript: (data: {
    text: string;
    extracted?: {
      reporter_name?: string;
      reporter_phone?: string;
      address?: string;
      type?: string;
      description: string;
      hazards: string[];
    };
  }) => void;
}

export default function VoiceRecorder({ onTranscript }: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      await processAudio(blob);
    };

    mediaRecorder.start();
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function processAudio(blob: Blob) {
    setProcessing(true);

    // Step 1: Transcribe with Groq Whisper
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    const transcribeRes = await fetch("/api/ai/transcribe", {
      method: "POST",
      body: formData,
    });
    const transcribeJson = await transcribeRes.json();
    const transcript = transcribeJson.data?.text ?? "";

    if (!transcript) {
      setProcessing(false);
      return;
    }

    // Step 2: Extract structured data with Gemini
    const extractRes = await fetch("/api/ai/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const extractJson = await extractRes.json();

    setProcessing(false);
    onTranscript({
      text: transcript,
      extracted: extractJson.data,
    });
  }

  return (
    <div className="flex items-center gap-2">
      {processing ? (
        <div className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#121214] px-3 py-2">
          <Loader2 size={16} className="animate-spin text-[#ff7b1c]" />
          <span className="text-xs text-[#888]">Transcribing & extracting...</span>
        </div>
      ) : recording ? (
        <button
          type="button"
          onClick={stopRecording}
          className="flex items-center gap-2 rounded-lg border border-[#ff2d2d]/30 bg-[#ff2d2d]/10 px-3 py-2 text-[#ff2d2d] animate-pulse"
        >
          <MicOff size={16} />
          <span className="text-xs font-medium">Stop recording</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={startRecording}
          className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#121214] px-3 py-2 text-[#888] hover:text-white hover:border-[#555] transition-colors"
        >
          <Mic size={16} />
          <span className="text-xs">Dictate incident</span>
        </button>
      )}
    </div>
  );
}
