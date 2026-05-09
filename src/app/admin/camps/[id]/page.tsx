"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Track, Activity, ActivitySeries } from "@/types/database";

type Tab = "tracks" | "activities" | "series";

const EMPTY_TRACK = { name: "", description: "", capacity: "", start_time: "", end_time: "", emoji: "" };
const EMPTY_ACTIVITY = { name: "", description: "", capacity: "", day: "", start_time: "", end_time: "", emoji: "", series_id: "" };
const EMPTY_SERIES = { name: "", description: "" };

export default function CampDetailPage() {
  const { id: campId } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("tracks");

  const [tracks, setTracks] = useState<Track[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [series, setSeries] = useState<ActivitySeries[]>([]);

  const [showTrackForm, setShowTrackForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showSeriesForm, setShowSeriesForm] = useState(false);

  const [trackForm, setTrackForm] = useState(EMPTY_TRACK);
  const [activityForm, setActivityForm] = useState(EMPTY_ACTIVITY);
  const [seriesForm, setSeriesForm] = useState(EMPTY_SERIES);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTracks() {
    const res = await fetch(`/api/admin/tracks?camp_id=${campId}`);
    if (res.ok) setTracks(await res.json());
  }
  async function loadActivities() {
    const res = await fetch(`/api/admin/activities?camp_id=${campId}`);
    if (res.ok) setActivities(await res.json());
  }
  async function loadSeries() {
    const res = await fetch(`/api/admin/series?camp_id=${campId}`);
    if (res.ok) setSeries(await res.json());
  }

  useEffect(() => {
    loadTracks();
    loadActivities();
    loadSeries();
  }, [campId]);

  async function handleCreateTrack(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await fetch("/api/admin/tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...trackForm, camp_id: campId }),
    });
    if (res.ok) { setTrackForm(EMPTY_TRACK); setShowTrackForm(false); await loadTracks(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to create track."); }
    setSaving(false);
  }

  async function handleCreateActivity(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await fetch("/api/admin/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...activityForm, camp_id: campId }),
    });
    if (res.ok) { setActivityForm(EMPTY_ACTIVITY); setShowActivityForm(false); await loadActivities(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to create activity."); }
    setSaving(false);
  }

  async function handleCreateSeries(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await fetch("/api/admin/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...seriesForm, camp_id: campId }),
    });
    if (res.ok) { setSeriesForm(EMPTY_SERIES); setShowSeriesForm(false); await loadSeries(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to create series."); }
    setSaving(false);
  }

  async function deleteTrack(id: string) {
    if (!confirm("Delete this track? Campers assigned to it will lose their track assignment.")) return;
    await fetch(`/api/admin/tracks/${id}`, { method: "DELETE" });
    await loadTracks();
  }

  async function deleteActivity(id: string) {
    if (!confirm("Delete this activity? All registrations for it will be removed.")) return;
    await fetch(`/api/admin/activities/${id}`, { method: "DELETE" });
    await loadActivities();
  }

  async function deleteSeries(id: string) {
    if (!confirm("Delete this series? Activities in it will become standalone.")) return;
    await fetch(`/api/admin/series/${id}`, { method: "DELETE" });
    await loadSeries();
  }

  const TAB_CLASSES = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 ${tab === t ? "border-black text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"}`;

  return (
    <div>
      <div className="mb-6">
        <a href="/admin/camps" className="text-sm text-gray-500 hover:text-gray-900">← Camps</a>
      </div>

      <div className="flex gap-0 border-b border-gray-200 mb-6">
        <button className={TAB_CLASSES("tracks")} onClick={() => setTab("tracks")}>Tracks</button>
        <button className={TAB_CLASSES("activities")} onClick={() => setTab("activities")}>Activities</button>
        <button className={TAB_CLASSES("series")} onClick={() => setTab("series")}>Series</button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      {/* ── TRACKS ── */}
      {tab === "tracks" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Tracks</h2>
            <button onClick={() => setShowTrackForm(!showTrackForm)} className="bg-black text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-800">
              {showTrackForm ? "Cancel" : "New track"}
            </button>
          </div>

          {showTrackForm && (
            <form onSubmit={handleCreateTrack} className="mb-6 p-5 bg-white border border-gray-200 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input required value={trackForm.name} onChange={e => setTrackForm({ ...trackForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Morning Track A" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input value={trackForm.description} onChange={e => setTrackForm({ ...trackForm, description: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start time</label>
                  <input required type="time" value={trackForm.start_time} onChange={e => setTrackForm({ ...trackForm, start_time: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End time</label>
                  <input required type="time" value={trackForm.end_time} onChange={e => setTrackForm({ ...trackForm, end_time: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Capacity</label>
                  <input required type="number" min="1" value={trackForm.capacity} onChange={e => setTrackForm({ ...trackForm, capacity: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="20" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Emoji <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input value={trackForm.emoji} onChange={e => setTrackForm({ ...trackForm, emoji: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="🎨" />
                </div>
              </div>
              <button type="submit" disabled={saving} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                {saving ? "Creating…" : "Create track"}
              </button>
            </form>
          )}

          {tracks.length === 0 ? (
            <p className="text-sm text-gray-500">No tracks yet.</p>
          ) : (
            <div className="space-y-2">
              {tracks.map(t => (
                <div key={t.id} className="p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t.emoji ? `${t.emoji} ` : ""}{t.name}</p>
                    <p className="text-sm text-gray-500">{t.start_time} – {t.end_time} · Capacity {t.capacity}</p>
                    {t.description && <p className="text-sm text-gray-500">{t.description}</p>}
                  </div>
                  <button onClick={() => deleteTrack(t.id)} className="text-sm text-red-600 hover:text-red-800 underline">Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVITIES ── */}
      {tab === "activities" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Activities</h2>
            <button onClick={() => setShowActivityForm(!showActivityForm)} className="bg-black text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-800">
              {showActivityForm ? "Cancel" : "New activity"}
            </button>
          </div>

          {showActivityForm && (
            <form onSubmit={handleCreateActivity} className="mb-6 p-5 bg-white border border-gray-200 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input required value={activityForm.name} onChange={e => setActivityForm({ ...activityForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Pottery" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input value={activityForm.description} onChange={e => setActivityForm({ ...activityForm, description: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Day</label>
                  <input required value={activityForm.day} onChange={e => setActivityForm({ ...activityForm, day: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Monday" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Capacity</label>
                  <input required type="number" min="1" value={activityForm.capacity} onChange={e => setActivityForm({ ...activityForm, capacity: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="15" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start time</label>
                  <input required type="time" value={activityForm.start_time} onChange={e => setActivityForm({ ...activityForm, start_time: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End time</label>
                  <input required type="time" value={activityForm.end_time} onChange={e => setActivityForm({ ...activityForm, end_time: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Emoji <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input value={activityForm.emoji} onChange={e => setActivityForm({ ...activityForm, emoji: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="🏺" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Series <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select value={activityForm.series_id} onChange={e => setActivityForm({ ...activityForm, series_id: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                    <option value="">None</option>
                    {series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={saving} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                {saving ? "Creating…" : "Create activity"}
              </button>
            </form>
          )}

          {activities.length === 0 ? (
            <p className="text-sm text-gray-500">No activities yet.</p>
          ) : (
            <div className="space-y-2">
              {activities.map(a => (
                <div key={a.id} className="p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium">{a.emoji ? `${a.emoji} ` : ""}{a.name}</p>
                    <p className="text-sm text-gray-500">{a.day} · {a.start_time} – {a.end_time} · Capacity {a.capacity}</p>
                    {a.series_id && <p className="text-sm text-gray-500">Series: {series.find(s => s.id === a.series_id)?.name ?? a.series_id}</p>}
                    {a.description && <p className="text-sm text-gray-500">{a.description}</p>}
                  </div>
                  <button onClick={() => deleteActivity(a.id)} className="text-sm text-red-600 hover:text-red-800 underline">Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SERIES ── */}
      {tab === "series" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Activity Series</h2>
            <button onClick={() => setShowSeriesForm(!showSeriesForm)} className="bg-black text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-800">
              {showSeriesForm ? "Cancel" : "New series"}
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">Create a series first, then assign activities to it. Campers who pick one activity in a series are auto-enrolled in all others.</p>

          {showSeriesForm && (
            <form onSubmit={handleCreateSeries} className="mb-6 p-5 bg-white border border-gray-200 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input required value={seriesForm.name} onChange={e => setSeriesForm({ ...seriesForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Pottery (2-part)" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={seriesForm.description} onChange={e => setSeriesForm({ ...seriesForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <button type="submit" disabled={saving} className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                {saving ? "Creating…" : "Create series"}
              </button>
            </form>
          )}

          {series.length === 0 ? (
            <p className="text-sm text-gray-500">No series yet.</p>
          ) : (
            <div className="space-y-2">
              {series.map(s => {
                const linked = activities.filter(a => a.series_id === s.id);
                return (
                  <div key={s.id} className="p-4 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      {s.description && <p className="text-sm text-gray-500">{s.description}</p>}
                      {linked.length > 0 && (
                        <p className="text-sm text-gray-500">{linked.map(a => a.name).join(", ")}</p>
                      )}
                    </div>
                    <button onClick={() => deleteSeries(s.id)} className="text-sm text-red-600 hover:text-red-800 underline">Delete</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
