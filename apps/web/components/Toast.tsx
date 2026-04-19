"use client";

import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

let addToastFn: ((msg: Omit<ToastMessage, "id">) => void) | null = null;

export function showToast(type: ToastMessage["type"], message: string) {
  addToastFn?.({ type, message });
}

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const COLORS = {
  success: "border-[#3ddc84]/30 text-[#3ddc84]",
  error: "border-[#ff2d2d]/30 text-[#ff2d2d]",
  info: "border-[#3b82f6]/30 text-[#3b82f6]",
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((msg: Omit<ToastMessage, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...msg, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-2 rounded-lg border bg-[#121214] px-4 py-3 shadow-lg animate-in slide-in-from-right ${COLORS[toast.type]}`}
          >
            <Icon size={16} />
            <span className="text-sm text-[#ccc]">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="ml-2 text-[#555] hover:text-[#888]"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
