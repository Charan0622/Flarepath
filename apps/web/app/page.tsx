import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="flex items-center gap-3">
        <span className="text-5xl">🚒</span>
        <h1 className="text-4xl font-bold tracking-tight">Flarepath</h1>
      </div>
      <p className="max-w-md text-center text-lg text-[#888]">
        Light the path from call to scene.
      </p>
      {user && (
        <p className="text-sm text-[#555]">
          Signed in as <span className="text-[#ccc]">{user.email}</span>
        </p>
      )}
      <div className="mt-4 flex gap-3">
        <span className="rounded-full bg-[#ff2d2d]/20 px-3 py-1 text-sm text-[#ff2d2d]">
          Critical
        </span>
        <span className="rounded-full bg-[#ff7b1c]/20 px-3 py-1 text-sm text-[#ff7b1c]">
          High
        </span>
        <span className="rounded-full bg-[#ffc93c]/20 px-3 py-1 text-sm text-[#ffc93c]">
          Medium
        </span>
        <span className="rounded-full bg-[#3ddc84]/20 px-3 py-1 text-sm text-[#3ddc84]">
          Low
        </span>
      </div>
      <p className="mt-8 text-sm text-[#555]">
        AI-Powered Fire Emergency Dispatch Platform
      </p>
    </div>
  );
}
