"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDateRange } from "@/lib/format";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { ShortcutBadge } from "@/components/admin/ShortcutBadge";
import type { Camp } from "@/types/database";
import { useAdminRole } from "@/components/admin/AdminRoleContext";

type FullCamp = Camp & { is_active: boolean; archived: boolean };

const EMPTY_FORM = { name: "", start_date: "", end_date: "", registration_open: false };

function isPast(camp: FullCamp) {
  return new Date(camp.end_date) < new Date(new Date().toDateString());
}

export default function CampsPage() {
  const { isAdmin } = useAdminRole();
  const [camps, setCamps] = useState<FullCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [editingCamp, setEditingCamp] = useState<FullCamp | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useKeyboardShortcut("n", () => { if (!editingCamp) setShowForm(v => !v); });

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

  async function deleteCamp(id: string) {
    setDeleting(true);
    await fetch(`/api/admin/camps/${id}`, { method: "DELETE" });
    setConfirmDeleteId(null);
    setOpenMenuId(null);
    setDeleting(false);
    await load();
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
    const menuOpen = openMenuId === camp.id;
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!menuOpen) return;
      function handleClick(e: MouseEvent) {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setOpenMenuId(null);
        }
      }
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, [menuOpen]);

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
            <button type="submit" disabled={saving} className="bg-black dark:bg-white dark:text-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
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
      <div className="p-5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium ${past || camp.archived ? "text-gray-400 dark:text-gray-500" : ""}`}>{camp.name}</span>
            {!camp.archived && (camp.is_active ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Active</span>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Draft</span>
            ))}
            {past && !camp.archived && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Past</span>}
            {!camp.archived && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${camp.registration_open ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                {camp.registration_open ? "Registration open" : "Registration closed"}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatDateRange(camp.start_date, camp.end_date)}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!camp.archived && (
            <Link
              href={`/admin/camps/${camp.id}`}
              className="text-sm font-medium px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors"
            >
              Manage
            </Link>
          )}

          {/* ⋯ overflow menu */}
          {isAdmin && <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpenMenuId(menuOpen ? null : camp.id)}
              className="p-1.5 rounded text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg leading-none"
              aria-label="More options"
            >
              ⋯
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-30">
                {!camp.archived ? (
                  <>
                    <MenuItem onClick={() => { setEditingCamp(camp); setEditForm({ name: camp.name, start_date: camp.start_date, end_date: camp.end_date, registration_open: camp.registration_open }); setShowForm(false); setOpenMenuId(null); }}>
                      Edit details
                    </MenuItem>
                    <MenuItem onClick={() => { patch(camp, { registration_open: !camp.registration_open }); setOpenMenuId(null); }}>
                      {camp.registration_open ? "Close registration" : "Open registration"}
                    </MenuItem>
                    <MenuItem onClick={() => { patch(camp, { is_active: !camp.is_active }); setOpenMenuId(null); }}>
                      {camp.is_active ? "Set to draft" : "Set active"}
                    </MenuItem>
                    <MenuItem onClick={() => { cloneCamp(camp); setOpenMenuId(null); }}>
                      Clone
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem destructive onClick={() => { patch(camp, { archived: true, is_active: false, registration_open: false }); setOpenMenuId(null); }}>
                      Archive
                    </MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem onClick={() => { patch(camp, { archived: false }); setOpenMenuId(null); }}>
                      Unarchive
                    </MenuItem>
                    <MenuItem onClick={() => { cloneCamp(camp); setOpenMenuId(null); }}>
                      Clone
                    </MenuItem>
                    <MenuDivider />
                    {confirmDeleteId === camp.id ? (
                      <div className="px-3 py-2 space-y-1">
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400">Delete all data?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => deleteCamp(camp.id)}
                            disabled={deleting}
                            className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-800 disabled:opacity-50"
                          >
                            {deleting ? "Deleting…" : "Yes, delete"}
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <MenuItem destructive onClick={() => setConfirmDeleteId(camp.id)}>
                        Delete permanently
                      </MenuItem>
                    )}
                  </>
                )}
              </div>
            )}
          </div>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Camps</h1>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="bg-black dark:bg-white dark:text-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100">
            {showForm ? "Cancel" : <span>New camp<ShortcutBadge>N</ShortcutBadge></span>}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
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
          <button type="submit" disabled={saving} className="bg-black dark:bg-white dark:text-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {saving ? "Creating…" : "Create camp"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading…</p>
      ) : (
        <div className="space-y-3">
          {camps.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm">No camps yet.</p>}
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

function MenuItem({ children, onClick, destructive }: { children: React.ReactNode; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
        destructive ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 border-t border-gray-100 dark:border-gray-700" />;
}
