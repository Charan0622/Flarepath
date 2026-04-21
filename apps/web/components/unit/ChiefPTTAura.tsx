"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Star } from "lucide-react";

// Shows a cyan aura at the top of the HUD when the chief is transmitting
// on the talkgroup — "X is typing" grammar but tactical. For demo, cycles
// on/off on a slow rhythm; in prod it would subscribe to the chief's PTT.
export default function ChiefPTTAura({ captainName }: { captainName: string }) {
  const [transmitting, setTransmitting] = useState(false);

  // Demo: cycle every 22s, transmit for 3s
  useEffect(() => {
    const loop = () => {
      setTransmitting(true);
      setTimeout(() => setTransmitting(false), 3200);
    };
    const first = setTimeout(loop, 8_000);
    const id = setInterval(loop, 22_000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);

  return (
    <AnimatePresence>
      {transmitting && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-12 left-1/2 -translate-x-1/2 z-[42] pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{
            background: "rgba(59,130,246,0.22)",
            border: "1px solid rgba(59,130,246,0.55)",
            boxShadow: "0 0 16px rgba(59,130,246,0.55), 0 0 40px rgba(59,130,246,0.22)",
          }}
        >
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "rgba(234,179,8,0.3)", border: "1px solid rgba(234,179,8,0.55)" }}
          >
            <Star size={10} fill="#eab308" stroke="#eab308" />
          </motion.div>
          <Radio size={11} style={{ color: "#60a5fa" }} />
          <span className="text-[10px] font-semibold tracking-wider" style={{ color: "#bfdbfe" }}>
            Capt. {captainName.split(" ").slice(-1)[0]} transmitting
          </span>
          <MiniBars />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MiniBars() {
  const [bars, setBars] = useState<number[]>([0.3, 0.6, 0.4, 0.8, 0.5]);
  useEffect(() => {
    const id = setInterval(() => {
      setBars(Array.from({ length: 5 }, () => 0.3 + Math.random() * 0.7));
    }, 120);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-end gap-[2px] h-4">
      {bars.map((b, i) => (
        <div key={i} className="w-[2px] rounded-full" style={{ height: `${Math.round(b * 100)}%`, background: "#60a5fa", opacity: 0.85 }} />
      ))}
    </div>
  );
}
