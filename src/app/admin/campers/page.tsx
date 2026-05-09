"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDateRange } from "@/lib/format";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { ShortcutBadge } from "@/components/admin/ShortcutBadge";

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
  const [camps, setCamps] = useState<Camp[]>([]);
  const [selectedCampId, setSelectedCampId] = useState<string>("");
  const [showAll, setShowAll] = useState(false);
  const [campers, setCampers] = useState<CamperRow[]>([]);
  const [loadingCamps, setLoadingCamps] = useState(true);
  const [loadingCampers, setLoadingCampers] = useState(false);
  const [search, setSearch] = useState("");

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
        .then(data => { setCampers(data); setLoadingCampers(false); });
    } else {
      if (!selectedCampId) return;
      setLoadingCampers(true);
      fetch(`/api/admin/campers?camp_id=${selectedCampId}`)
        .then(r => r.json())
        .then(data => { setCampers(data); setLoadingCampers(false); });
    }
  }, [selectedCampId, showAll]);

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
    const data = await fetch(url).then(r => r.json());
    setCampers(data);
  }

  const filtered = campers.filter(c => {
    const q = search.toLowerCase();
    return (
      c.chosen_first_name.toLowerCase().includes(q) ||
      c.chosen_last_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const destinationCamps = camps.filter(c => !c.archived && (showAll || c.id !== selectedCampId));
  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="pb-32">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campers</h1>
        <div className="flex items-center gap-3">
          {!loadingCampers && (
            <span className="text-sm text-gray-500">{campers.length} registered</span>
          )}
          {!loadingCampers && campers.length > 0 && (
            <button
              onClick={() => selecting ? exitSelecting() : setSelecting(true)}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              {selecting ? "Cancel" : <span>Select<ShortcutBadge>S</ShortcutBadge></span>}
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
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
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
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            {showAll ? "Filter by camp" : "All campers"}
          </button>
        </div>
      )}

      <div className="relative mb-6">
        <input
          ref={searchRef}
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <span className="[@media(pointer:fine)]:flex hidden absolute right-3 top-1/2 -translate-y-1/2 items-center pointer-events-none">
          <kbd className="text-xs font-mono bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-gray-400">/</kbd>
        </span>
      </div>

      {loadingCamps || loadingCampers ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {search ? "No campers match your search." : "No campers registered yet."}
        </p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {/* Select all row */}
          {selecting && (
            <button
              onClick={toggleSelectAll}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 text-sm text-gray-600"
            >
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${allSelected ? "bg-black border-black" : "border-gray-300"}`}>
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
                className={`flex items-center gap-4 px-5 py-4 transition-colors ${selecting ? "cursor-pointer hover:bg-gray-50" : ""} ${isSelected ? "bg-blue-50" : ""}`}
                onClick={selecting ? () => toggleSelect(c.id) : undefined}
              >
                {selecting && (
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "bg-black border-black" : "border-gray-300"}`}>
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </span>
                )}
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {c.chosen_first_name} {c.chosen_last_name}
                      </span>
                      {c.pronouns && (
                        <span className="text-xs text-gray-400">({c.pronouns})</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{c.email}</p>
                    {showAll && c.camps && (
                      <p className="text-xs text-gray-400">{c.camps.name}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm text-gray-700">{c.tracks?.name ?? <span className="text-gray-400">No track</span>}</p>
                    <p className="text-xs text-gray-400">{c.registrations.length} activit{c.registrations.length === 1 ? "y" : "ies"}</p>
                  </div>
                </div>
              </div>
            );

            return selecting ? (
              <div key={c.id}>{row}</div>
            ) : (
              <Link key={c.id} href={`/admin/campers/${c.id}`} className="block hover:bg-gray-50 transition-colors">
                {row}
              </Link>
            );
          })}
        </div>
      )}

      {/* Sticky action bar */}
      {selecting && selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-6 py-4">
          <div className="max-w-5xl mx-auto flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-900">{selected.size} camper{selected.size === 1 ? "" : "s"} selected</p>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={moveToCampId}
                onChange={e => { setMoveToCampId(e.target.value); setConfirmBulkMove(false); }}
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
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
                  <span className="text-sm text-amber-700">Clears all tracks and activities —</span>
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
