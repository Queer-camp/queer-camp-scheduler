"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatDateRange } from "@/lib/format";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { ShortcutBadge } from "@/components/admin/ShortcutBadge";
import { useAdminRole } from "@/components/admin/AdminRoleContext";

type Camp = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  archived: boolean;
};

type CamperRow = {
  id: string;
  chosen_first_name: string;
  chosen_last_name: string;
  pronouns: string | null;
  email: string;
  camp_id: string;
  camps: { name: string } | null;
  tracks: { name: string } | null;
  registrations: { id: string }[];
};

export default function CampersPage() {
  const { isAdmin } = useAdminRole();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [selectedCampId, setSelectedCampId] = useState<string>("");
  const [showAll, setShowAll] = useState(false);
  const [campers, setCampers] = useState<CamperRow[]>([]);
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [loadingCampers, setLoadingCampers] = useState(false);
  const [search, setSearch] = useState("");
  const [totalSlots, setTotalSlots] = useState(0);
  const [sortBy, setSortBy] = useState<"name" | "fullness">("name");

  // New camper form
  const EMPTY_CAMPER_FORM = { chosen_first_name: "", chosen_last_name: "", legal_first_name: "", legal_last_name: "", pronouns: "", email: "" };
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_CAMPER_FORM);
  const [savingNew, setSavingNew] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);

  // Selection mode
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveToCampId, setMoveToCampId] = useState("");
  const [confirmBulkMove, setConfirmBulkMove] = useState(false);
  const [movingBulk, setMovingBulk] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcut("/", () => { searchRef.current?.focus(); });
  useKeyboardShortcut("s", () => { if (campers.length > 0) setSelecting(v => !v); });
  useKeyboardShortcut("a", () => { if (selecting) toggleSelectAll(); }, { enabled: selecting });

  useEffect(() => {
    fetch("/api/admin/camps")
      .then(r => r.json())
      .then((data: Camp[]) => {
        setCamps(data);
        const active = data.find(c => c.is_active);
        if (active) setSelectedCampId(active.id);
        setLoadingCamps(false);
      });
  }, []);

  useEffect(() => {
    if (showAll) {
      setLoadingCampers(true);
      fetch("/api/admin/campers")
        .then(r => r.json())
        .then(d => { setCampers(d.campers); setTotalSlots(0); setLoadingCampers(false); });
    } else {
      if (!selectedCampId) return;
      setLoadingCampers(true);
      fetch(`/api/admin/campers?camp_id=${selectedCampId}`)
        .then(r => r.json())
        .then(d => { setCampers(d.campers); setTotalSlots(d.totalSlots ?? 0); setLoadingCampers(false); });
    }
  }, [selectedCampId, showAll]);

  async function handleCreateCamper(e: React.FormEvent) {
    e.preventDefault();
    setSavingNew(true); setNewError(null);
    const res = await fetch("/api/admin/campers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newForm, camp_id: selectedCampId }),
    });
    if (res.ok) {
      setNewForm(EMPTY_CAMPER_FORM);
      setShowNewForm(false);
      const url = `/api/admin/campers?camp_id=${selectedCampId}`;
      const d = await fetch(url).then(r => r.json());
      setCampers(d.campers); setTotalSlots(d.totalSlots ?? 0);
    } else {
      const d = await res.json();
      setNewError(d.error ?? "Failed to create camper.");
    }
    setSavingNew(false);
  }

  function exitSelecting() {
    setSelecting(false);
    setSelected(new Set());
    setMoveToCampId("");
    setConfirmBulkMove(false);
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setConfirmBulkMove(false);
    setMoveToCampId("");
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(c => c.id)));
    }
    setConfirmBulkMove(false);
    setMoveToCampId("");
  }

  async function executeBulkMove() {
    if (!moveToCampId || selected.size === 0) return;
    setMovingBulk(true);
    await Promise.all(
      Array.from(selected).map(camperId =>
        fetch(`/api/admin/campers/${camperId}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ camp_id: moveToCampId }),
        })
      )
    );
    setMovingBulk(false);
    exitSelecting();
    // Reload
    const url = showAll ? "/api/admin/campers" : `/api/admin/campers?camp_id=${selectedCampId}`;
    const d = await fetch(url).then(r => r.json());
    setCampers(d.campers); setTotalSlots(d.totalSlots ?? 0);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = campers.filter(c =>
      c.chosen_first_name.toLowerCase().includes(q) ||
      c.chosen_last_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
    if (sortBy === "fullness" && totalSlots > 0) {
      list.sort((a, b) => a.registrations.length - b.registrations.length);
    }
    return list;
  }, [campers, search, sortBy, totalSlots]);

  const destinationCamps = camps.filter(c => !c.archived && (showAll || c.id !== selectedCampId));
  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="pb-32">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campers</h1>
        <div className="flex items-center gap-3">
          {!loadingCampers && (
            <span className="text-sm text-gray-500 dark:text-gray-400">{campers.length} registered</span>
          )}
          {isAdmin && !loadingCampers && campers.length > 0 && !showAll && (
            <button
              onClick={() => selecting ? exitSelecting() : setSelecting(true)}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline"
            >
              {selecting ? "Cancel" : <span>Select<ShortcutBadge>S</ShortcutBadge></span>}
            </button>
          )}
          {isAdmin && !showAll && selectedCampId && (
            <button
              onClick={() => { setShowNewForm(v => !v); setNewError(null); exitSelecting(); }}
              className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800"
            >
              {showNewForm ? "Cancel" : "New camper"}
            </button>
          )}
        </div>
      </div>

      {/* Camp selector / All toggle */}
      {!loadingCamps && (
        <div className="flex items-center gap-3 mb-6">
          {!showAll && (
            <select
              value={selectedCampId}
              onChange={e => { setSelectedCampId(e.target.value); setSearch(""); exitSelecting(); }}
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 dark:text-gray-100"
            >
              {camps.filter(c => !c.archived).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {formatDateRange(c.start_date, c.end_date)}{c.is_active ? " (active)" : ""}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => { setShowAll(!showAll); setSearch(""); exitSelecting(); }}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline"
          >
            {showAll ? "Filter by camp" : "All campers"}
          </button>
        </div>
      )}

      {/* New camper form */}
      {isAdmin && showNewForm && !showAll && (
        <form onSubmit={handleCreateCamper} className="mb-6 p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
          <h2 className="font-semibold">New camper</h2>
          {newError && <p className="text-sm text-red-600">{newError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chosen first name</label>
              <input required type="text" value={newForm.chosen_first_name} onChange={e => setNewForm({ ...newForm, chosen_first_name: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" placeholder="Sparkles" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chosen last name</label>
              <input required type="text" value={newForm.chosen_last_name} onChange={e => setNewForm({ ...newForm, chosen_last_name: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" placeholder="McCrispy" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Legal first name</label>
              <input required type="text" value={newForm.legal_first_name} onChange={e => setNewForm({ ...newForm, legal_first_name: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Legal last name</label>
              <input required type="text" value={newForm.legal_last_name} onChange={e => setNewForm({ ...newForm, legal_last_name: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pronouns <span className="font-normal text-gray-400 dark:text-gray-500">(optional)</span></label>
              <input type="text" value={newForm.pronouns} onChange={e => setNewForm({ ...newForm, pronouns: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" placeholder="they/them" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email <span className="font-normal text-gray-400 dark:text-gray-500">(optional — schedule link will be sent if provided)</span></label>
              <input type="email" value={newForm.email} onChange={e => setNewForm({ ...newForm, email: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" placeholder="sparkles@example.com" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={savingNew} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {savingNew ? "Creating…" : "Create camper"}
            </button>
            <button type="button" onClick={() => { setShowNewForm(false); setNewForm(EMPTY_CAMPER_FORM); setNewError(null); }} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline">
              Discard
            </button>
          </div>
        </form>
      )}

      <div className="relative mb-6">
        <input
          ref={searchRef}
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
        />
        <span className="[@media(pointer:fine)]:flex hidden absolute right-3 top-1/2 -translate-y-1/2 items-center pointer-events-none">
          <kbd className="text-xs font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-gray-400 dark:text-gray-400">/</kbd>
        </span>
      </div>

      {totalSlots > 0 && !loadingCampers && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
          <span>Sort:</span>
          <button
            onClick={() => setSortBy("name")}
            className={`px-2 py-0.5 rounded ${sortBy === "name" ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium" : "hover:text-gray-900 dark:hover:text-gray-100"}`}
          >
            A–Z
          </button>
          <button
            onClick={() => setSortBy("fullness")}
            className={`px-2 py-0.5 rounded ${sortBy === "fullness" ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium" : "hover:text-gray-900 dark:hover:text-gray-100"}`}
          >
            Fewest first
          </button>
        </div>
      )}

      {loadingCamps || loadingCampers ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {search ? "No campers match your search." : "No campers registered yet."}
        </p>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {/* Select all row */}
          {selecting && (
            <button
              onClick={toggleSelectAll}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-600 dark:text-gray-400"
            >
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${allSelected ? "bg-black border-black" : "border-gray-300 dark:border-gray-600"}`}>
                {allSelected && <span className="text-white text-xs">✓</span>}
              </span>
              {allSelected ? "Deselect all" : `Select all (${filtered.length})`}
            </button>
          )}

          {filtered.map(c => {
            const isSelected = selected.has(c.id);
            const row = (
              <div
                key={c.id}
                className={`flex items-center gap-4 px-5 py-4 transition-colors ${selecting ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" : ""} ${isSelected ? "bg-blue-50 dark:bg-blue-950" : ""}`}
                onClick={selecting ? () => toggleSelect(c.id) : undefined}
              >
                {selecting && (
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "bg-black border-black" : "border-gray-300 dark:border-gray-600"}`}>
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </span>
                )}
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {c.chosen_first_name} {c.chosen_last_name}
                      </span>
                      {c.pronouns && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">({c.pronouns})</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{c.email}</p>
                    {c.camps && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{c.camps.name}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{c.tracks?.name ?? <span className="text-gray-400 dark:text-gray-500">No track</span>}</p>
                    {totalSlots > 0 ? (
                      <div className="flex items-center gap-2 justify-end mt-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{c.registrations.length}/{totalSlots}</span>
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (c.registrations.length / totalSlots) * 100)}%`,
                              background: c.registrations.length === 0
                                ? "#ef4444"
                                : c.registrations.length >= totalSlots
                                  ? "#22c55e"
                                  : "#7c3aed",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{c.registrations.length} activit{c.registrations.length === 1 ? "y" : "ies"}</p>
                    )}
                  </div>
                </div>
              </div>
            );

            return selecting ? (
              <div key={c.id}>{row}</div>
            ) : (
              <Link key={c.id} href={`/admin/campers/${c.id}`} className="block hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {row}
              </Link>
            );
          })}
        </div>
      )}

      {/* Sticky action bar */}
      {isAdmin && selecting && selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg px-6 py-4">
          <div className="max-w-5xl mx-auto flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{selected.size} camper{selected.size === 1 ? "" : "s"} selected</p>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={moveToCampId}
                onChange={e => { setMoveToCampId(e.target.value); setConfirmBulkMove(false); }}
                className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white bg-white dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Move to camp…</option>
                {destinationCamps.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {formatDateRange(c.start_date, c.end_date)}{c.is_active ? " (active)" : ""}
                  </option>
                ))}
              </select>

              {moveToCampId && !confirmBulkMove && (
                <button
                  onClick={() => setConfirmBulkMove(true)}
                  className="text-sm bg-black text-white px-4 py-2 rounded font-medium hover:bg-gray-800"
                >
                  Move
                </button>
              )}

              {confirmBulkMove && (
                <>
                  <span className="text-sm text-amber-700 dark:text-amber-400">Clears all tracks and activities —</span>
                  <button
                    onClick={executeBulkMove}
                    disabled={movingBulk}
                    className="text-sm bg-black text-white px-4 py-2 rounded font-medium hover:bg-gray-800 disabled:opacity-50"
                  >
                    {movingBulk ? "Moving…" : "Confirm move"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
