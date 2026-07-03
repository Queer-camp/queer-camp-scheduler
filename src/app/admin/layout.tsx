"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useKeyboardShortcut, useSequenceShortcuts } from "@/hooks/useKeyboardShortcut";
import { KeyboardShortcutsModal } from "@/components/admin/KeyboardShortcutsModal";
import { ThemeProvider, useTheme } from "@/components/admin/ThemeProvider";
import { AdminRoleContext } from "@/components/admin/AdminRoleContext";

type Me = { id: string; name: string | null; email: string; role: string };

function AdminNav() {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    fetch("/api/admin/me").then(r => r.ok ? r.json() : null).then(setMe);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setShowUserMenu(false);
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
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
  const isLeader = me?.role === "leader";

  const navLinks = [
    { href: "/admin/now", label: "Now" },
    { href: "/admin/camps", label: "Camps" },
    ...(!isLeader ? [
      { href: "/admin/campers", label: "Campers" },
      { href: "/admin/broadcast", label: "Broadcast" },
    ] : []),
    { href: "/admin/admins", label: "Staff" },
  ];

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border-b border-white/60 dark:border-gray-700 relative z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <Link href="/admin" className="flex items-center gap-2 font-bold text-gray-900 dark:text-white hover:opacity-80 transition-opacity shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/queer-camp-logo.png" alt="" aria-hidden="true" className="h-7 w-auto" />
              <span className="hidden sm:inline">Queer Camp Admin</span>
              <span className="sm:hidden">QC Admin</span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-5">
              {navLinks.map(link => (
                <Link key={link.href} href={link.href}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop right controls */}
            <div className="hidden md:flex items-center gap-3">
              <button onClick={toggle}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded px-2 py-1"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
                {theme === "dark" ? "Light" : "Dark"}
              </button>
              <button onClick={() => setShowShortcuts(true)}
                className="[@media(pointer:fine)]:block hidden text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 font-mono"
                title="Keyboard shortcuts">
                ?
              </button>

              {/* User menu */}
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-1.5 text-sm text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white font-semibold">
                  {firstName}
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-40">
                    {me && (
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{me.name ?? "Admin"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{me.email}</p>
                      </div>
                    )}
                    <Link href="/admin/profile" onClick={() => setShowUserMenu(false)}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                      Your profile
                    </Link>
                    <form action="/api/admin/logout" method="POST">
                      <button type="submit" className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700">
                        Sign out
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: theme toggle + hamburger */}
            <div className="flex md:hidden items-center gap-2">
              <button onClick={toggle}
                className="text-xs text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded px-2 py-1">
                {theme === "dark" ? "Light" : "Dark"}
              </button>
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(link => (
                <Link key={link.href} href={link.href}
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800">
              {me && (
                <div className="px-3 py-2 mb-1">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{me.name ?? "Admin"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{me.email}</p>
                </div>
              )}
              <Link href="/admin/profile"
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                Your profile
              </Link>
              <form action="/api/admin/logout" method="POST">
                <button type="submit"
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        )}
      </nav>
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}

function WelcomeBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("welcome") === "1") {
      setVisible(true);
      // Strip the param so a bookmark taken from this page doesn't carry it forever
      router.replace(pathname);
    }
  }, [searchParams, router, pathname]);

  if (!visible) return null;

  return (
    <div className="bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-purple-900 dark:text-purple-200">
          <strong>You&apos;re in!</strong> Bookmark this page (or add it to your phone&apos;s home screen) so you can get back in without checking your email again.
        </p>
        <button
          onClick={() => setVisible(false)}
          className="shrink-0 text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-200"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const RAINBOW = "#d93025, #f5810e, #f5c23e, #5dbb46, #4b96f3, #7c3aed, #e879a8";
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/me").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.role) setRole(data.role);
    });
  }, []);

  return (
    <ThemeProvider>
      <AdminRoleContext.Provider value={role}>
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100">
          <div className="h-2" style={{ background: `linear-gradient(to right, ${RAINBOW})` }} />
          <AdminNav />
          <Suspense fallback={null}>
            <WelcomeBanner />
          </Suspense>
          <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
        </div>
      </AdminRoleContext.Provider>
    </ThemeProvider>
  );
}
