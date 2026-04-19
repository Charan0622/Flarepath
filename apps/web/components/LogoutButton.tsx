"use client";

import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[#888] transition-colors hover:bg-[#1a1a1e] hover:text-white"
      >
        <LogOut size={16} />
        <span>Sign out</span>
      </button>
    </form>
  );
}
