export default function ChiefLayout({ children }: { children: React.ReactNode }) {
  // Chief console has its own full-screen shell — no shared NavRail, no
  // dispatcher chrome. This is a dedicated role experience.
  return (
    <div className="h-screen w-screen overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      {children}
    </div>
  );
}
