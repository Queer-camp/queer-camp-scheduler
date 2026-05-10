"use client";

import { useEffect, useState } from "react";

type Me = { id: string; name: string | null; email: string; role: string };

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Me | null) => {
        if (data) {
          setMe(data);
          setName(data.name ?? "");
        }
        setLoading(false);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/admin/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const data = await res.json();
      setMe(data);
      setSuccess("Profile updated.");
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to update.");
    }
    setSaving(false);
  }

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";
  const fieldCls = "w-full border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400";

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;
  if (!me) return <p className="text-sm text-red-500">Could not load profile.</p>;

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>

      {success && (
        <p className="mb-4 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-200/20 rounded px-4 py-3">{success}</p>
      )}
      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded px-4 py-3">{error}</p>
      )}

      <form onSubmit={save} className="space-y-4 p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <div className={fieldCls}>{me.email}</div>
          <p className="text-xs text-gray-400 mt-1">Email is tied to your magic-link login and can't be changed here.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
          <div className={fieldCls + " capitalize"}>{me.role}</div>
        </div>

        <button
          type="submit"
          disabled={saving || name.trim() === (me.name ?? "")}
          className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
