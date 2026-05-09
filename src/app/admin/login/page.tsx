"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

const RAINBOW = "linear-gradient(to right, #d93025, #f5810e, #f5c23e, #5dbb46, #4b96f3, #7c3aed, #e879a8)";

function ErrorMessage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (error === "expired") {
    return (
      <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 rounded-lg">
        That login link has expired. Request a new one.
      </p>
    );
  }
  if (error === "invalid") {
    return (
      <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 rounded-lg">
        Invalid login link. Request a new one.
      </p>
    );
  }
  return null;
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admin/send-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="flex justify-center pt-6">
        <div className="w-full max-w-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center space-y-3 shadow-sm">
            <div className="text-5xl">📬</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Check your email</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              If <strong className="text-gray-900 dark:text-gray-200">{email}</strong> is an admin account, your login link is on its way. It expires in 15 minutes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center pt-6">
      <div className="w-full max-w-sm space-y-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/queer-camp-logo.png" alt="Queer Camp" className="h-14 w-auto mx-auto drop-shadow-md" />

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-7 space-y-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Login</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Queer Camp Scheduler</p>
          </div>

          <Suspense>
            <ErrorMessage />
          </Suspense>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-2.5 px-6 rounded-full font-bold text-sm shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ background: RAINBOW }}
            >
              {loading ? "Sending…" : "Send login link"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
