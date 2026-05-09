"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function ErrorMessage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (error === "expired") {
    return (
      <p className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">
        That login link has expired. Request a new one.
      </p>
    );
  }
  if (error === "invalid") {
    return (
      <p className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">
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

  const RAINBOW = "#d93025, #f5810e, #f5c23e, #5dbb46, #4b96f3, #7c3aed, #e879a8";
  const GRADIENT = "linear-gradient(to right, #e879a8, #7c3aed, #4b96f3)";

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col">
        <div className="h-2" style={{ background: `linear-gradient(to right, ${RAINBOW})` }} />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border-t-4 p-8 text-center space-y-3" style={{ borderTopColor: "#7c3aed" }}>
            <div className="text-5xl">📬</div>
            <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
            <p className="text-gray-600">
              If <strong>{email}</strong> is an admin account, you&apos;ll receive a login link shortly. It expires in 15 minutes.
            </p>
          </div>
        </div>
        <div className="h-2" style={{ background: `linear-gradient(to right, ${RAINBOW})` }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col">
      <div className="h-2" style={{ background: `linear-gradient(to right, ${RAINBOW})` }} />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/queer-camp-logo.png" alt="Queer Camp" className="h-20 w-auto mx-auto drop-shadow-md" />

          <div className="bg-white rounded-2xl shadow-sm border-t-4 p-8 space-y-6" style={{ borderTopColor: "#e879a8" }}>
            <div>
              <h1
                className="text-3xl font-extrabold tracking-tight mb-2"
                style={{
                  background: `linear-gradient(to right, ${RAINBOW})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Admin Login
              </h1>
              <p className="text-gray-600">Queer Camp Scheduler</p>
            </div>

            <Suspense>
              <ErrorMessage />
            </Suspense>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-900">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow placeholder:text-gray-400"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-3 px-6 rounded-full font-bold text-base shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style={{ background: GRADIENT }}
              >
                {loading ? "Sending…" : "Send login link"}
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="h-2" style={{ background: `linear-gradient(to right, ${RAINBOW})` }} />
    </div>
  );
}
