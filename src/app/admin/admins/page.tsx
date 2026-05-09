"use client";

import { useEffect, useState } from "react";

type Admin = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  created_at: string;
};

type Me = { id: string };

const EMPTY_FORM = { name: "", email: "" };

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  async function load() {
    const [adminsRes, meRes] = await Promise.all([
      fetch("/api/admin/admins"),
      fetch("/api/admin/me"),
    ]);
    if (adminsRes.ok) setAdmins(await adminsRes.json());
    if (meRes.ok) setMe(await meRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSuccessMsg(null);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      setSuccessMsg(`Invite sent to ${form.email}.`);
      await load();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to send invite.");
    }
    setSaving(false);
  }

  async function removeAdmin(id: string) {
    setRemoving(true);
    const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to remove admin.");
    } else {
      setSuccessMsg("Admin removed and notified by email.");
    }
    setConfirmRemoveId(null);
    setRemoving(false);
    await load();
  }

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admins</h1>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); setSuccessMsg(null); setConfirmRemoveId(null); }}
          className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800"
        >
          {showForm ? "Cancel" : "Invite admin"}
        </button>
      </div>

      {successMsg && (
        <p className="mb-6 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-200/20 rounded px-4 py-3">{successMsg}</p>
      )}

      {error && (
        <p className="mb-6 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded px-4 py-3">{error}</p>
      )}

      {showForm && (
        <form onSubmit={handleInvite} className="mb-8 p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
          <h2 className="font-semibold">Invite a new admin</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">They'll receive an email with a link to accept the invitation and log in.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Jordan Smith" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="jordan@example.com" />
          </div>
          <button type="submit" disabled={saving} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {saving ? "Sending invite…" : "Send invite"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading…</p>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {admins.map(a => (
            <div key={a.id} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{a.name ?? <span className="text-gray-400 dark:text-gray-500 font-normal">No name</span>}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{a.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">{a.role}</span>
                  {a.id !== me?.id && confirmRemoveId !== a.id && (
                    <button
                      onClick={() => { setConfirmRemoveId(a.id); setError(null); setSuccessMsg(null); }}
                      className="text-sm text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 underline"
                    >
                      Remove
                    </button>
                  )}
                  {a.id === me?.id && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">You</span>
                  )}
                </div>
              </div>

              {confirmRemoveId === a.id && (
                <div className="mt-3 flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400 flex-1">
                    Remove {a.name ?? a.email}? They'll be notified by email.
                  </p>
                  <button
                    onClick={() => removeAdmin(a.id)}
                    disabled={removing}
                    className="text-sm bg-red-600 text-white px-3 py-1.5 rounded font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {removing ? "Removing…" : "Confirm"}
                  </button>
                  <button
                    onClick={() => setConfirmRemoveId(null)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
