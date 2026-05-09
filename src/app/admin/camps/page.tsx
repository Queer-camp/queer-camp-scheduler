"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Camp } from "@/types/database";

type CampWithActive = Camp & { is_active: boolean };
const EMPTY_FORM = { name: "", start_date: "", end_date: "", registration_open: false };

export default function CampsPage() {
  const [camps, setCamps] = useState<CampWithActive[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/camps");
    if (res.ok) setCamps(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/camps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to create camp.");
    }
    setSaving(false);
  }

  async function toggleRegistration(camp: CampWithActive) {
    await fetch(`/api/admin/camps/${camp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registration_open: !camp.registration_open }),
    });
    await load();
  }

  async function setActive(camp: CampWithActive) {
    await fetch(`/api/admin/camps/${camp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Camps</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800"
        >
          {showForm ? "Cancel" : "New camp"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 p-6 bg-white rounded-lg border border-gray-200 space-y-4">
          <h2 className="font-semibold">New camp</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Queer Camp 2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.registration_open}
              onChange={(e) => setForm({ ...form, registration_open: e.target.checked })}
            />
            Open registration immediately
          </label>
          <button
            type="submit"
            disabled={saving}
            className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create camp"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : camps.length === 0 ? (
        <p className="text-gray-500 text-sm">No camps yet.</p>
      ) : (
        <div className="space-y-3">
          {camps.map((camp) => (
            <div
              key={camp.id}
              className="p-5 bg-white rounded-lg border border-gray-200 flex items-center justify-between"
            >
              <div>
                <Link href={`/admin/camps/${camp.id}`} className="font-medium hover:underline">{camp.name}</Link>
                <p className="text-sm text-gray-500">
                  {camp.start_date} – {camp.end_date}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {camp.is_active && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                    Active
                  </span>
                )}
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    camp.registration_open
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {camp.registration_open ? "Registration open" : "Registration closed"}
                </span>
                <button
                  onClick={() => toggleRegistration(camp)}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  {camp.registration_open ? "Close reg" : "Open reg"}
                </button>
                {!camp.is_active && (
                  <button
                    onClick={() => setActive(camp)}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Set active
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
