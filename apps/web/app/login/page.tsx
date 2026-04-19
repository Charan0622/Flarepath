"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Enter your email first");
      return;
    }
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(false);
    alert("Check your email for the magic link!");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <span className="text-4xl">🚒</span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Sign in to Flarepath
          </h1>
          <p className="mt-2 text-sm text-[#888]">
            AI-Powered Fire Dispatch
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
              placeholder="dispatcher@sjfd.org"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#333] bg-[#121214] px-3 py-2 text-white placeholder-[#555] focus:border-[#ff2d2d] focus:outline-none focus:ring-1 focus:ring-[#ff2d2d]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-[#ff2d2d]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#ff2d2d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e02525] disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={loading}
            className="w-full rounded-md border border-[#333] bg-transparent px-4 py-2 text-sm text-[#ccc] transition-colors hover:bg-[#1a1a1e] disabled:opacity-50"
          >
            Send magic link instead
          </button>
        </form>

        <p className="text-center text-sm text-[#888]">
          No account?{" "}
          <Link href="/signup" className="text-[#ff2d2d] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
