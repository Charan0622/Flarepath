"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SEED_ORG_ID = "4a780897-794c-42eb-9944-e81cb8e00623";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"dispatcher" | "firefighter" | "chief">("dispatcher");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        organization_id: SEED_ORG_ID,
        role,
        full_name: fullName,
      });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <span className="text-4xl">🚒</span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Join Flarepath
          </h1>
          <p className="mt-2 text-sm text-[#888]">
            San Jose Fire Department
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-[#ccc]">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#333] bg-[#121214] px-3 py-2 text-white placeholder-[#555] focus:border-[#ff2d2d] focus:outline-none focus:ring-1 focus:ring-[#ff2d2d]"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#ccc]">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#333] bg-[#121214] px-3 py-2 text-white placeholder-[#555] focus:border-[#ff2d2d] focus:outline-none focus:ring-1 focus:ring-[#ff2d2d]"
              placeholder="john@sjfd.org"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#ccc]">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#333] bg-[#121214] px-3 py-2 text-white placeholder-[#555] focus:border-[#ff2d2d] focus:outline-none focus:ring-1 focus:ring-[#ff2d2d]"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-[#ccc]">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "dispatcher" | "firefighter" | "chief")}
              className="mt-1 block w-full rounded-md border border-[#333] bg-[#121214] px-3 py-2 text-white focus:border-[#ff2d2d] focus:outline-none focus:ring-1 focus:ring-[#ff2d2d]"
            >
              <option value="dispatcher">Dispatcher</option>
              <option value="firefighter">Firefighter</option>
              <option value="chief">Chief</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-[#ff2d2d]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#ff2d2d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e02525] disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-[#888]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#ff2d2d] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
