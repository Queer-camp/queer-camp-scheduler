"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useKeyboardShortcut, useSequenceShortcuts } from "@/hooks/useKeyboardShortcut";
import { KeyboardShortcutsModal } from "@/components/admin/KeyboardShortcutsModal";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const router = useRouter();

  useKeyboardShortcut("?", () => setShowShortcuts(v => !v));
  useSequenceShortcuts({
    "gc": () => router.push("/admin/camps"),
    "gp": () => router.push("/admin/campers"),
  }, { enabled: !showShortcuts });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">Queer Camp Admin</span>
          <Link href="/admin/camps" className="text-sm text-gray-600 hover:text-gray-900">
            Camps
          </Link>
          <Link href="/admin/campers" className="text-sm text-gray-600 hover:text-gray-900">
            Campers
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowShortcuts(true)}
            className="[@media(pointer:fine)]:block hidden text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded px-2 py-1 font-mono"
            title="Keyboard shortcuts"
          >
            ?
          </button>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
