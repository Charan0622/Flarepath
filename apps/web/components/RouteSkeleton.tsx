"use client";

// Instant route skeleton — rendered by Next.js App Router's loading.tsx files
// while the target segment compiles and fetches. Keeps interactions feeling
// responsive instead of freezing on the previous page.
export default function RouteSkeleton({ variant = "shell" }: { variant?: "shell" | "center" | "map" }) {
  if (variant === "center") {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ef4444] border-t-transparent" />
          <div className="text-[10px] tracking-[0.24em] uppercase" style={{ color: "#71717a" }}>
            Loading
          </div>
        </div>
      </div>
    );
  }
  if (variant === "map") {
    return (
      <div className="h-full w-full relative overflow-hidden" style={{ background: "#08080c" }}>
        <div className="absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 400px at 40% 45%, rgba(239,68,68,0.1), transparent 70%),radial-gradient(500px 300px at 65% 60%, rgba(59,130,246,0.08), transparent 70%)",
          }} />
        <div className="absolute top-3 left-3 right-3 h-10 rounded-lg glass" />
        <div className="absolute bottom-4 left-4 right-4 h-20 rounded-xl glass-strong" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ef4444] border-t-transparent" />
          <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: "#a1a1aa" }}>
            Spinning up tactical view
          </span>
        </div>
      </div>
    );
  }
  // shell: page shell with header bar + content grid placeholders
  return (
    <div className="h-full w-full flex flex-col" style={{ background: "#08080c" }}>
      <div className="h-12 glass-strip glass-divider-b flex items-center px-4 gap-3">
        <div className="h-6 w-6 rounded-full" style={{ background: "rgba(239,68,68,0.2)" }} />
        <div className="h-3 w-32 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="ml-auto h-3 w-20 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
      <div className="flex-1 grid gap-3 p-4" style={{ gridTemplateColumns: "repeat(12, 1fr)", gridAutoRows: "minmax(80px, auto)" }}>
        <div className="glass-card rounded-xl animate-pulse" style={{ gridColumn: "span 8", gridRow: "span 4" }} />
        <div className="glass-card rounded-xl animate-pulse" style={{ gridColumn: "span 4", gridRow: "span 2" }} />
        <div className="glass-card rounded-xl animate-pulse" style={{ gridColumn: "span 4", gridRow: "span 2" }} />
        <div className="glass-card rounded-xl animate-pulse" style={{ gridColumn: "span 6", gridRow: "span 2" }} />
        <div className="glass-card rounded-xl animate-pulse" style={{ gridColumn: "span 6", gridRow: "span 2" }} />
      </div>
    </div>
  );
}
