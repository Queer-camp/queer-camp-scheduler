"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useKeyboardShortcut, useSequenceShortcuts } from "@/hooks/useKeyboardShortcut";
import { KeyboardShortcutsModal } from "@/components/admin/KeyboardShortcutsModal";

type Me = { id: string; name: string | null; email: string; role: string };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/me").then(r => r.ok ? r.json() : null).then(setMe);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useKeyboardShortcut("?", () => setShowShortcuts(v => !v));
  useSequenceShortcuts({
    "gc": () => router.push("/admin/camps"),
    "gp": () => router.push("/admin/campers"),
  }, { enabled: !showShortcuts });

  const firstName = me?.name?.split(" ")[0] ?? me?.email ?? "…";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">Queer Camp Admin</span>
          <Link href="/admin/camps" className="text-sm text-gray-600 hover:text-gray-900">Camps</Link>
          <Link href="/admin/campers" className="text-sm text-gray-600 hover:text-gray-900">Campers</Link>
          <Link href="/admin/admins" className="text-sm text-gray-600 hover:text-gray-900">Admins</Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowShortcuts(true)}
            className="[@media(pointer:fine)]:block hidden text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded px-2 py-1 font-mono"
            title="Keyboard shortcuts"
          >
            ?
          </button>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 font-medium"
            >
              {firstName}
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-40">
                {me && (
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-900 truncate">{me.name ?? "Admin"}</p>
                    <p className="text-xs text-gray-400 truncate">{me.email}</p>
                  </div>
                )}
                <form action="/api/admin/logout" method="POST">
                  <button
                    type="submit"
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
