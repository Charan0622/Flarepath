"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Mic, Volume2 } from "lucide-react";
import type { CrewMember } from "@/lib/crew-data";

interface Message {
  id: string;
  from: string;        // name
  badge: string;
  text: string;
  ts: string;
  isVoice?: boolean;
}

interface Props {
  memberName: string;
  memberBadge: string;
  members: CrewMember[];
  captain: CrewMember | null;
  callSign: string;
}

// Engine-company side-channel. Lightweight in-memory demo messages; in
// production this would use the unit-scoped Supabase Realtime channel.
export default function CrewChatter({ memberName, memberBadge, members, captain, callSign }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(2);
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Seed a few demo messages from teammates on first open
  useEffect(() => {
    if (messages.length > 0) return;
    const now = Date.now();
    const cap = captain;
    const peer = members.find((m) => m.badge !== memberBadge);
    const seed: Message[] = [
      cap ? { id: "s1", from: cap.name, badge: cap.badge, text: `All ${callSign.split(" ")[0]} crew ${callSign.split(" ")[1]}, check radios TAC-1.`, ts: new Date(now - 4 * 60_000).toISOString() } : null,
      peer ? { id: "s2", from: peer.name, badge: peer.badge, text: "Radio check good.", ts: new Date(now - 3 * 60_000).toISOString(), isVoice: true } : null,
      cap ? { id: "s3", from: cap.name, badge: cap.badge, text: "Staging on arrival · RIT team ready.", ts: new Date(now - 2 * 60_000).toISOString() } : null,
    ].filter(Boolean) as Message[];
    setMessages(seed);
  }, [captain, members, memberBadge, callSign, messages.length]);

  useEffect(() => {
    if (open) { setUnread(0); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }
  }, [open, messages.length]);

  function send() {
    if (!draft.trim()) return;
    setMessages((prev) => [...prev, { id: `m-${Date.now()}`, from: memberName, badge: memberBadge, text: draft.trim(), ts: new Date().toISOString() }]);
    setDraft("");
  }

  return (
    <>
      <div className="mx-3">
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-xl px-3 py-2.5 flex items-center gap-2.5 text-left"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.02))",
            border: "1px solid rgba(59,130,246,0.28)",
          }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(59,130,246,0.22)", border: "1px solid rgba(59,130,246,0.45)" }}>
            <MessageSquare size={15} style={{ color: "#60a5fa" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-white">{callSign} Chatter</div>
            <div className="text-[10px]" style={{ color: "#a1a1aa" }}>
              {messages.length === 0 ? "No messages" : `Last: ${messages[messages.length - 1].text.slice(0, 32)}${messages[messages.length - 1].text.length > 32 ? "…" : ""}`}
            </div>
          </div>
          {unread > 0 && (
            <span className="min-w-[20px] h-[20px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: "#3b82f6", color: "#fff", boxShadow: "0 0 6px rgba(59,130,246,0.6)" }}>
              {unread}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[55] flex items-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0" style={{ background: "rgba(4,4,8,0.65)", backdropFilter: "blur(8px)" }}
              onClick={() => setOpen(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="glass-strong relative w-full rounded-t-2xl flex flex-col"
              style={{ maxHeight: "80vh", boxShadow: "0 -12px 32px rgba(0,0,0,0.5)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 rounded-full mx-auto mt-2" style={{ background: "rgba(255,255,255,0.12)" }} />
              <div className="flex items-center justify-between px-4 py-3 glass-divider-b">
                <div>
                  <div className="text-[13px] font-bold text-white">{callSign} Chatter</div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: "#71717a" }}>Side-channel · not on incident freq</div>
                </div>
                <button onClick={() => setOpen(false)} className="text-[11px] px-2 py-1 rounded" style={{ color: "#a1a1aa" }}>Close</button>
              </div>

              <div className="flex-1 overflow-auto px-3 py-3 space-y-2">
                {messages.map((m) => {
                  const isMe = m.badge === memberBadge;
                  return (
                    <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className="max-w-[80%] rounded-xl px-3 py-2"
                        style={{
                          background: isMe
                            ? "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.1))"
                            : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isMe ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.06)"}`,
                        }}
                      >
                        {!isMe && <div className="text-[9px] font-semibold mb-0.5" style={{ color: "#a1a1aa" }}>{m.from.split(" ")[0]} {m.from.split(" ").slice(-1)[0][0]}.</div>}
                        <div className="flex items-center gap-2">
                          {m.isVoice && <Volume2 size={11} style={{ color: "#a1a1aa" }} />}
                          <span className="text-[12px]" style={{ color: "#e4e4e7" }}>{m.text}</span>
                        </div>
                        <div className="text-[9px] mt-1 font-mono tabular-nums" style={{ color: "#71717a" }}>
                          {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="flex items-center gap-2 p-3 glass-divider-t">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  placeholder="Message your company…"
                  className="flex-1 rounded-xl px-3 py-2.5 text-[13px] outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#fff",
                    minHeight: 44,
                  }}
                />
                <button className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#a1a1aa" }}>
                  <Mic size={15} />
                </button>
                <button
                  onClick={send}
                  disabled={!draft.trim()}
                  className="p-2.5 rounded-xl disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff" }}
                >
                  <Send size={15} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
