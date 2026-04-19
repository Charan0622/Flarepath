"use client";

import { useEffect } from "react";

interface Props {
  onNewIncident: () => void;
  onCloseDrawer: () => void;
  onCommandPalette: () => void;
}

export default function KeyboardShortcuts({ onNewIncident, onCloseDrawer, onCommandPalette }: Props) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onNewIncident();
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onCloseDrawer();
      }

      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onCommandPalette();
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNewIncident, onCloseDrawer, onCommandPalette]);

  return null;
}
