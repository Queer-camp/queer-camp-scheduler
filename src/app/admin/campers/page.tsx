"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateRange } from "@/lib/format";

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

  const filtered = campers.filter(c => {
    const q = search.toLowerCase();
    return (
      c.chosen_first_name.toLowerCase().includes(q) ||
      c.chosen_last_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campers</h1>
        {!loadingCampers && (
          <span className="text-sm text-gray-500">{campers.length} registered</span>
        )}
      </div>

      {/* Camp selector / All toggle */}
      {!loadingCamps && (
        <div className="flex items-center gap-3 mb-6">
          {!showAll && (
            <select
              value={selectedCampId}
              onChange={e => { setSelectedCampId(e.target.value); setSearch(""); }}
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
            onClick={() => { setShowAll(!showAll); setSearch(""); }}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            {showAll ? "Filter by camp" : "All campers"}
          </button>
        </div>
      )}

      <input
        type="search"
        placeholder="Search by name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-black"
      />

      {loadingCamps || loadingCampers ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {search ? "No campers match your search." : "No campers registered yet."}
        </p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {filtered.map(c => (
            <Link
              key={c.id}
              href={`/admin/campers/${c.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
