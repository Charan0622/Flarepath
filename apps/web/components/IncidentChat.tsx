"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Send } from "lucide-react";

interface Message {
  id: string;
  message: string;
  created_at: string;
  profiles: { full_name: string; role: string } | null;
}

export default function IncidentChat({ incidentId }: { incidentId: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["chat", incidentId],
    queryFn: async () => {
      const res = await fetch(`/api/incidents/${incidentId}/chat`);
      return (await res.json()).data;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${incidentId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "incident_messages", filter: `incident_id=eq.${incidentId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat", incidentId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [incidentId, queryClient]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    await fetch(`/api/incidents/${incidentId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    setText("");
    setSending(false);
  }

  const ROLE_COLORS: Record<string, string> = {
    dispatcher: "#3b82f6", firefighter: "#ff7b1c", chief: "#ffc93c", admin: "#3ddc84",
  };

  return (
    <div className="flex flex-col h-64 border-t border-[#1a1a1e]">
      <div className="px-3 py-2 border-b border-[#1a1a1e]">
        <h4 className="text-xs font-semibold text-[#888] uppercase tracking-wider">Incident Chat</h4>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-xs text-[#555] text-center py-4">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-xs">
              <span style={{ color: ROLE_COLORS[msg.profiles?.role ?? ""] ?? "#888" }} className="font-semibold">
                {msg.profiles?.full_name ?? "Unknown"}
              </span>
              <span className="text-[#555] ml-1.5">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <p className="text-[#ccc] mt-0.5">{msg.message}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-[#1a1a1e] p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-md border border-[#333] bg-[#121214] px-2.5 py-1.5 text-xs text-white placeholder-[#555] focus:border-[#ff2d2d] focus:outline-none"
        />
        <button type="submit" disabled={sending || !text.trim()} className="rounded-md bg-[#ff2d2d] p-1.5 text-white disabled:opacity-50">
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}
