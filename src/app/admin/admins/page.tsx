"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminRole } from "@/components/admin/AdminRoleContext";
import { StaffDrawer } from "@/components/admin/StaffDrawer";

type Admin = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  created_at: string;
};

type Me = { id: string };

const EMPTY_FORM = { name: "", email: "", role: "admin" as "admin" | "leader" };

export default function AdminsPage() {
  const { isAdmin } = useAdminRole();
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
  // Per-row state for adding email or sending invite
  const [addEmailId, setAddEmailId] = useState<string | null>(null);
  const [addEmailValue, setAddEmailValue] = useState("");
  const [addEmailSaving, setAddEmailSaving] = useState(false);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);
  const sendInviteOnCreate = useRef(false);
  const [drawerStaffId, setDrawerStaffId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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
      body: JSON.stringify({ name: form.name, email: form.email || null, role: form.role, sendInvite: sendInviteOnCreate.current }),
    });
    if (res.ok) {
      const created = await res.json();
      const didSendInvite = sendInviteOnCreate.current && !!created.email;
      setForm(EMPTY_FORM);
      setShowForm(false);
      setSuccessMsg(didSendInvite ? `Invite sent to ${created.email} as ${form.role}.` : `${form.name} added as ${form.role}.${created.email ? "" : " Add their email later to send an invite."}`);
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

  async function saveEmail(id: string) {
    setAddEmailSaving(true); setError(null);
    const res = await fetch(`/api/admin/admins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addEmailValue }),
    });
    if (res.ok) {
      // Send invite now that we have an email
      const inviteRes = await fetch(`/api/admin/admins/${id}/send-invite`, { method: "POST" });
      setAddEmailId(null);
      setAddEmailValue("");
      setSuccessMsg(inviteRes.ok ? "Email saved and invite sent." : "Email saved, but invite email failed to send.");
      await load();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save email.");
    }
    setAddEmailSaving(false);
  }

  async function sendInvite(id: string) {
    setSendingInviteId(id); setError(null);
    const res = await fetch(`/api/admin/admins/${id}/send-invite`, { method: "POST" });
    if (res.ok) {
      setSuccessMsg("Invite sent.");
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to send invite.");
    }
    setSendingInviteId(null);
  }

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500";
  const inlineCls = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500";

  function lastName(name: string | null): string {
    if (!name) return "";
    const parts = name.trim().split(" ");
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
  }
  function sortedGroup(group: Admin[]) {
    return [...group].sort((a, b) => lastName(a.name).localeCompare(lastName(b.name)));
  }
  function filteredGroup(group: Admin[]) {
    const q = search.trim().toLowerCase();
    if (!q) return sortedGroup(group);
    return sortedGroup(group).filter(a =>
      (a.name ?? "").toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q)
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Staff</h1>
        {isAdmin && (
          <button
            onClick={() => { setShowForm(!showForm); setError(null); setSuccessMsg(null); setConfirmRemoveId(null); }}
            className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800"
          >
            {showForm ? "Cancel" : "Invite member"}
          </button>
        )}
      </div>

      {successMsg && (
        <p className="mb-6 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-200/20 rounded px-4 py-3">{successMsg}</p>
      )}

      {error && (
        <p className="mb-6 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded px-4 py-3">{error}</p>
      )}

      {isAdmin && showForm && (
        <form onSubmit={handleInvite} className="mb-8 p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
          <h2 className="font-semibold">Add a new member</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Email is optional — you can add it later and send the invite when ready.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Jordan Smith" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="jordan@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
            <div className="flex gap-3">
              {(["admin", "leader"] as const).map(r => (
                <label key={r} className={`flex items-start gap-2.5 flex-1 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  form.role === r ? "border-black dark:border-white bg-gray-50 dark:bg-gray-800" : "border-gray-200 dark:border-gray-700 hover:border-gray-400"
                }`}>
                  <input type="radio" name="role" value={r} checked={form.role === r} onChange={() => setForm({ ...form, role: r })} className="mt-0.5 accent-black" />
                  <div>
                    <p className="text-sm font-semibold capitalize text-gray-900 dark:text-white">{r}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {r === "admin" ? "Full access — can create, edit, and delete everything." : "Read-only — can view everything but cannot make changes."}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              onClick={() => { sendInviteOnCreate.current = false; }}
              className="bg-black dark:bg-white dark:text-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {form.email && (
              <button
                type="submit"
                disabled={saving}
                onClick={() => { sendInviteOnCreate.current = true; }}
                className="border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save & send invite"}
              </button>
            )}
          </div>
        </form>
      )}

      {!loading && (
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className={inputCls}
          />
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading…</p>
      ) : (
        <>
          {(["admin", "leader"] as const).map(role => {
            const group = filteredGroup(admins.filter(a => a.role === role));
            return (
              <div key={role} className="mb-8">
                <h2 className="text-base font-semibold capitalize mb-3">{role === "admin" ? "Admins" : "Leaders"}</h2>
                {group.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No {role === "leader" ? "leaders" : "admins"} yet.</p>
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                    {group.map((a: Admin) => (
                      <div key={a.id} className="px-5 py-4">
                        <div
                          className="flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 -mx-5 px-5 -my-1 py-1 rounded transition-colors"
                          onClick={e => { if ((e.target as HTMLElement).closest("button,input,a")) return; setDrawerStaffId(a.id); }}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white">{a.name ?? <span className="text-gray-400 dark:text-gray-500 font-normal">No name</span>}</p>
                            {a.email ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{a.email}</p>
                            ) : (
                              <p className="text-sm text-gray-400 dark:text-gray-500 italic">No email</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {isAdmin && a.id !== me?.id && (
                              <>
                                {!a.email && addEmailId !== a.id && (
                                  <button
                                    onClick={() => { setAddEmailId(a.id); setAddEmailValue(""); setError(null); setSuccessMsg(null); }}
                                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline"
                                  >
                                    Add email
                                  </button>
                                )}
                                {a.email && (
                                  <button
                                    onClick={() => sendInvite(a.id)}
                                    disabled={sendingInviteId === a.id}
                                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline disabled:opacity-50"
                                  >
                                    {sendingInviteId === a.id ? "Sending…" : "Send invite"}
                                  </button>
                                )}
                                {confirmRemoveId !== a.id && (
                                  <button
                                    onClick={() => { setConfirmRemoveId(a.id); setError(null); setSuccessMsg(null); }}
                                    className="text-sm text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 underline"
                                  >
                                    Remove
                                  </button>
                                )}
                              </>
                            )}
                            {a.id === me?.id && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">You</span>
                            )}
                          </div>
                        </div>

                        {isAdmin && addEmailId === a.id && (
                          <div className="mt-3 flex items-center gap-2">
                            <input
                              type="email"
                              autoFocus
                              value={addEmailValue}
                              onChange={e => setAddEmailValue(e.target.value)}
                              placeholder="email@example.com"
                              className={inlineCls + " flex-1"}
                            />
                            <button
                              onClick={() => saveEmail(a.id)}
                              disabled={addEmailSaving || !addEmailValue.trim()}
                              className="text-sm bg-black dark:bg-white dark:text-black text-white px-3 py-1.5 rounded font-medium hover:bg-gray-800 disabled:opacity-50"
                            >
                              {addEmailSaving ? "Saving…" : "Save & send invite"}
                            </button>
                            <button
                              onClick={() => { setAddEmailId(null); setAddEmailValue(""); }}
                              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 underline"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {isAdmin && confirmRemoveId === a.id && (
                          <div className="mt-3 flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                            <p className="text-sm text-red-700 dark:text-red-400 flex-1">
                              Remove {a.name ?? a.email}? {a.email ? "They'll be notified by email." : ""}
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
          })}
        </>
      )}
      {drawerStaffId && (
        <StaffDrawer
          staffId={drawerStaffId}
          onClose={() => setDrawerStaffId(null)}
          onUpdated={() => { load(); }}
          meId={me?.id ?? null}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
