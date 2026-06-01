"use client";

import { useEffect, useRef, useState } from "react";

type StaffMember = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  created_at: string;
};

type EventItem = {
  id: string;
  name: string;
  emoji: string | null;
  day?: string | null;
  camp_id: string;
  camps: { id: string; name: string; is_active: boolean } | null;
};

type Note = {
  id: string;
  body: string;
  created_by_name: string;
  created_at: string;
};

type StaffDetail = {
  person: StaffMember;
  tracks: EventItem[];
  activities: EventItem[];
  standingEvents: EventItem[];
};

export function StaffDrawer({
  staffId,
  onClose,
  onUpdated,
  meId,
}: {
  staffId: string;
  onClose: () => void;
  onUpdated: () => void;
  meId: string | null;
}) {
  const [detail, setDetail] = useState<StaffDetail | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState<{ name: string; email: string; role: "admin" | "leader" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    const [detailRes, notesRes] = await Promise.all([
      fetch(`/api/admin/staff/${staffId}`),
      fetch(`/api/admin/staff/${staffId}/notes`),
    ]);
    if (detailRes.ok) {
      const d = await detailRes.json();
      setDetail(d);
      setEditForm({ name: d.person.name ?? "", email: d.person.email ?? "", role: d.person.role });
    }
    if (notesRes.ok) setNotes(await notesRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [staffId]);

  // Close on backdrop click
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function saveEdit() {
    if (!editForm) return;
    setSaving(true); setSaveError(null);
    const res = await fetch(`/api/admin/admins/${staffId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editForm.name, email: editForm.email || null, role: editForm.role }),
    });
    if (res.ok) {
      await load();
      onUpdated();
    } else {
      const d = await res.json();
      setSaveError(d.error ?? "Failed to save.");
    }
    setSaving(false);
  }

  async function addNote() {
    if (!noteBody.trim()) return;
    setSavingNote(true);
    const res = await fetch(`/api/admin/staff/${staffId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody }),
    });
    if (res.ok) {
      setNoteBody("");
      const updated = await fetch(`/api/admin/staff/${staffId}/notes`);
      if (updated.ok) setNotes(await updated.json());
    }
    setSavingNote(false);
  }

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500";

  // Group events by camp
  function groupByCamp(items: EventItem[], type: string) {
    const map = new Map<string, { camp: EventItem["camps"]; items: { id: string; name: string; emoji: string | null; type: string; day?: string | null }[] }>();
    for (const item of items) {
      const campId = item.camp_id;
      if (!map.has(campId)) map.set(campId, { camp: item.camps, items: [] });
      map.get(campId)!.items.push({ id: item.id, name: item.name, emoji: item.emoji, type, day: item.day });
    }
    return map;
  }

  function buildCampGroups(detail: StaffDetail) {
    const all = new Map<string, { camp: EventItem["camps"]; items: { id: string; name: string; emoji: string | null; type: string; day?: string | null }[]; isActive: boolean }>();
    for (const [campId, group] of [
      ...groupByCamp(detail.tracks, "Track"),
      ...groupByCamp(detail.activities, "Activity"),
      ...groupByCamp(detail.standingEvents, "Standing event"),
    ]) {
      if (!all.has(campId)) all.set(campId, { camp: group.camp, items: [], isActive: group.camp?.is_active ?? false });
      all.get(campId)!.items.push(...group.items);
    }
    return [...all.values()].sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
  }

  const isSelf = detail?.person.id === meId;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-semibold">{loading ? "Loading…" : (detail?.person.name ?? "Staff member")}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none">×</button>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-400">Loading…</div>
        ) : !detail || !editForm ? (
          <div className="p-6 text-sm text-red-500">Failed to load.</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Edit info */}
            <section className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Info</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className={inputCls}
                    placeholder="Full name"
                    disabled={isSelf}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className={inputCls}
                    placeholder="email@example.com"
                    disabled={isSelf}
                  />
                </div>
                {!isSelf && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Role</label>
                    <div className="flex gap-2">
                      {(["admin", "leader"] as const).map(r => (
                        <label key={r} className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer text-sm transition-colors ${editForm.role === r ? "border-black dark:border-white bg-gray-50 dark:bg-gray-800 font-medium" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"}`}>
                          <input type="radio" name="edit-role" value={r} checked={editForm.role === r} onChange={() => setEditForm({ ...editForm, role: r })} className="sr-only" />
                          <span className="capitalize">{r}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {saveError && <p className="text-xs text-red-500">{saveError}</p>}
                {!isSelf && (
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="bg-black dark:bg-white dark:text-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                )}
                {isSelf && <p className="text-xs text-gray-400 dark:text-gray-500">Edit your own profile from the Profile page.</p>}
              </div>
            </section>

            {/* Assigned events */}
            <section className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Assigned events</h3>
              {(() => {
                const groups = buildCampGroups(detail);
                if (groups.length === 0) return <p className="text-sm text-gray-400 dark:text-gray-500 italic">No events assigned.</p>;
                return (
                  <div className="space-y-4">
                    {groups.map(group => (
                      <div key={group.camp?.id ?? "unknown"}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{group.camp?.name ?? "Unknown camp"}</span>
                          {group.isActive && <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-medium">Active</span>}
                        </div>
                        <div className="space-y-1">
                          {group.items.map(item => (
                            <div key={item.id + item.type} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <span>{item.emoji ?? "📌"}</span>
                              <span>{item.name}</span>
                              <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{item.type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>

            {/* Notes */}
            <section className="px-6 py-5">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Notes</h3>
              <div className="space-y-2 mb-4">
                <textarea
                  ref={noteRef}
                  value={noteBody}
                  onChange={e => setNoteBody(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }}
                  rows={3}
                  placeholder="Add a note… (⌘↵ to save)"
                  className={inputCls + " resize-none"}
                />
                <button
                  onClick={addNote}
                  disabled={savingNote || !noteBody.trim()}
                  className="bg-black dark:bg-white dark:text-black text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {savingNote ? "Saving…" : "Add note"}
                </button>
              </div>

              {notes.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No notes yet.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map(note => (
                    <div key={note.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{note.body}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {note.created_by_name} · {new Date(note.created_at).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
