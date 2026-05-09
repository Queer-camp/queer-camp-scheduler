"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateRange } from "@/lib/format";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { ShortcutBadge } from "@/components/admin/ShortcutBadge";
import type { Camp } from "@/types/database";

type FullCamp = Camp & { is_active: boolean; archived: boolean };

const EMPTY_FORM = { name: "", start_date: "", end_date: "", registration_open: false };

function isPast(camp: FullCamp) {
  return new Date(camp.end_date) < new Date(new Date().toDateString());
}

export default function CampsPage() {
  const [camps, setCamps] = useState<FullCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [editingCamp, setEditingCamp] = useState<FullCamp | null>(null);

  useKeyboardShortcut("n", () => { if (!editingCamp) { setShowForm(v => !v); } });
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  async function load() {
    const res = await fetch("/api/admin/camps");
    if (res.ok) setCamps(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await fetch("/api/admin/camps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setForm(EMPTY_FORM); setShowForm(false); await load(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to create camp."); }
    setSaving(false);
  }

  async function patch(camp: FullCamp, updates: object) {
    await fetch(`/api/admin/camps/${camp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await load();
  }

  async function saveCamp(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCamp) return;
    setSaving(true); setError(null);
    await fetch(`/api/admin/camps/${editingCamp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditingCamp(null);
    await load();
    setSaving(false);
  }

  async function cloneCamp(camp: FullCamp) {
    const res = await fetch(`/api/admin/camps/${camp.id}/clone`, { method: "POST" });
    if (res.ok) await load();
  }

  const active = camps.filter(c => !c.archived);
  const archived = camps.filter(c => c.archived);

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500";

  function CampCard({ camp }: { camp: FullCamp }) {
    const past = isPast(camp);
    const isEditing = editingCamp?.id === camp.id;

    if (isEditing) {
      return (
        <form onSubmit={saveCamp} className="p-5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input type="text" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start date</label>
              <input type="date" required value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End date</label>
              <input type="date" required value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editForm.registration_open} onChange={e => setEditForm({ ...editForm, registration_open: e.target.checked })} />
            Registration open
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditingCamp(null)} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline">
              Cancel
            </button>
          </div>
        </form>
      );
    }

    return (
      <div className="p-5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/admin/camps/${camp.id}`} className={`font-medium hover:underline ${past || camp.archived ? "text-gray-400 dark:text-gray-500" : ""}`}>{camp.name}</Link>
            {camp.is_active ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Active</span>
            ) : (
              !camp.archived && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Draft</span>
            )}
            {past && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Past</span>}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${camp.registration_open ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
              {camp.registration_open ? "Registration open" : "Registration closed"}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatDateRange(camp.start_date, camp.end_date)}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          <Link href={`/admin/camps/${camp.id}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-black dark:hover:text-white underline">
            Manage
          </Link>
          <button onClick={() => { setEditingCamp(camp); setEditForm({ name: camp.name, start_date: camp.start_date, end_date: camp.end_date, registration_open: camp.registration_open }); setShowForm(false); }} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline">
            Edit
          </button>
          <button onClick={() => patch(camp, { registration_open: !camp.registration_open })} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline">
            {camp.registration_open ? "Close reg" : "Open reg"}
          </button>
          {camp.is_active ? (
            <button onClick={() => patch(camp, { is_active: false })} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline">
              Set draft
            </button>
          ) : (
            <button onClick={() => patch(camp, { is_active: true })} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline">
              Set active
            </button>
          )}
          <button onClick={() => cloneCamp(camp)} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline">
            Clone
          </button>
          {!camp.archived ? (
            <button onClick={() => patch(camp, { archived: true })} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline">
              Archive
            </button>
          ) : (
            <button onClick={() => patch(camp, { archived: false })} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline">
              Unarchive
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Camps</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800">
          {showForm ? "Cancel" : <span>New camp<ShortcutBadge>N</ShortcutBadge></span>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
          <h2 className="font-semibold">New camp</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Queer Camp 2026" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start date</label>
              <input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End date</label>
              <input type="date" required value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.registration_open} onChange={e => setForm({ ...form, registration_open: e.target.checked })} />
            Open registration immediately
          </label>
          <button type="submit" disabled={saving} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {saving ? "Creating…" : "Create camp"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading…</p>
      ) : (
        <div className="space-y-3">
          {active.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No camps yet.</p>}
          {active.map(camp => <CampCard key={camp.id} camp={camp} />)}

          {archived.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium mb-3"
              >
                <span>{showArchived ? "▾" : "▸"}</span>
                Archived camps ({archived.length})
              </button>
              {showArchived && (
                <div className="space-y-3">
                  {archived.map(camp => <CampCard key={camp.id} camp={camp} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
