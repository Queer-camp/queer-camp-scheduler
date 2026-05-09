"use client";

import { useState, FormEvent } from "react";

const RAINBOW = "#d93025, #f5810e, #f5c23e, #5dbb46, #4b96f3, #7c3aed, #e879a8";
const GRADIENT = "linear-gradient(to right, #e879a8, #7c3aed, #4b96f3)";

export default function GetLinkPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/get-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setDone(true);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col">
      <div className="h-2" style={{ background: `linear-gradient(to right, ${RAINBOW})` }} />

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full space-y-8">
          {/* Logo */}
          <div className="text-center space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/queer-camp-logo.png" alt="Queer Camp" className="h-24 w-auto mx-auto drop-shadow-md" />
          </div>

          {done ? (
            <div className="bg-white rounded-2xl shadow-sm border-t-4 p-8 text-center space-y-3" style={{ borderTopColor: "#7c3aed" }}>
              <div className="text-5xl">📬</div>
              <h1 className="text-2xl font-bold text-gray-900">Check your inbox!</h1>
              <p className="text-gray-600">
                If <strong>{email}</strong> is registered, your personal schedule
                link is on its way. Check your spam folder if it doesn&apos;t
                arrive within a few minutes.
              </p>
            </div>
          ) : (
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
                  Get your schedule link
                </h1>
                <p className="text-gray-600">
                  Enter the email address you registered with and we&apos;ll
                  send your personal schedule link right over.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-900">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow placeholder:text-gray-400"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full text-white py-3 px-6 rounded-full font-bold text-base shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  style={{ background: GRADIENT }}
                >
                  {submitting ? "Sending…" : "Send my link"}
                </button>
              </form>

              <p className="text-sm text-gray-500 text-center">
                Haven&apos;t registered yet?{" "}
                <a href="/register" className="underline hover:text-gray-700">
                  Register here
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="h-2" style={{ background: `linear-gradient(to right, ${RAINBOW})` }} />
    </div>
  );
}
