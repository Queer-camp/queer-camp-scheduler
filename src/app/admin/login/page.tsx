"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow text-center">
          <h1 className="text-2xl font-bold mb-4">Check your email</h1>
          <p className="text-gray-600">
            If <strong>{email}</strong> is an admin account, you&apos;ll receive a login link shortly. It expires in 15 minutes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-2">Admin Login</h1>
        <p className="text-gray-600 mb-6">Queer Camp Scheduler</p>

        {error === "expired" && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">
            That login link has expired. Request a new one.
          </p>
        )}
        {error === "invalid" && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">
            Invalid login link. Request a new one.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 px-4 rounded font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send login link"}
          </button>
        </form>
      </div>
    </div>
  );
}
