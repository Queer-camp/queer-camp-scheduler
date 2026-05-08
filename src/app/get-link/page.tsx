"use client";

import { useState, FormEvent } from "react";

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

  if (done) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-3">Check your email</h1>
        <p className="text-gray-600">
          If <strong>{email}</strong> is registered, you&apos;ll receive your
          schedule link shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-2">Get your schedule link</h1>
      <p className="text-gray-600 mb-8">
        Enter the email address you registered with and we&apos;ll send you
        your personal schedule link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-black text-white py-3 px-6 rounded font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Sending…" : "Send my link"}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-500">
        Haven&apos;t registered yet?{" "}
        <a href="/register" className="underline">
          Register here
        </a>
      </p>
    </div>
  );
}
