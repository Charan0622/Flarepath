"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between rounded-lg border border-[#1a1a1e] bg-[#121214] p-4 shadow-lg lg:hidden">
      <div className="flex items-center gap-3">
        <Download size={20} className="text-[#ff2d2d]" />
        <div>
          <p className="text-sm font-medium text-white">Install Flarepath</p>
          <p className="text-xs text-[#888]">Add to home screen for quick access</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="rounded-md bg-[#ff2d2d] px-3 py-1.5 text-xs font-semibold text-white"
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-md p-1.5 text-[#888] hover:bg-[#1a1a1e]"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
