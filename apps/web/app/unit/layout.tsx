export default function UnitLayout({ children }: { children: React.ReactNode }) {
  // Mobile-first dedicated shell for the firefighter's personal HUD.
  // No shared NavRail — this is the member's whole world.
  return (
    <div className="h-screen w-screen overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      {children}
    </div>
  );
}
