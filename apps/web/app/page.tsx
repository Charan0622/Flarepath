import dynamic from "next/dynamic";

const DashboardShell = dynamic(() => import("@/components/DashboardShell"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center" style={{ background: "#08080c" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ef4444] border-t-transparent" />
        <span className="text-[11px]" style={{ color: "#48484e" }}>Loading command center...</span>
      </div>
    </div>
  ),
});

export default function HomePage() {
  return <DashboardShell />;
}
