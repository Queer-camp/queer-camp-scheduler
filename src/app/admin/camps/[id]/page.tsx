"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Track, Activity, ActivitySeries } from "@/types/database";
import { formatTime } from "@/lib/format";

type Tab = "tracks" | "activities" | "series";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const EMPTY_TRACK = { name: "", description: "", capacity: "", start_time: "", end_time: "", emoji: "" };
const EMPTY_ACTIVITY = { name: "", description: "", capacity: "", day: "", start_time: "", end_time: "", emoji: "", series_id: "" };
const EMPTY_SERIES = { name: "", description: "" };

type TrackForm = typeof EMPTY_TRACK;
type ActivityForm = typeof EMPTY_ACTIVITY;
type SeriesForm = typeof EMPTY_SERIES;

function DayPicker({ value, onChange }: { value: string; onChange: (day: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {DAYS.map(day => (
        <button
          key={day}
          type="button"
          onClick={() => onChange(day)}
          className={`px-2 py-1 rounded text-xs font-medium border ${
            value === day
              ? "bg-black text-white border-black"
              : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
          }`}
        >
          {day.slice(0, 3)}
        </button>
      ))}
    </div>
  );
}

function TrackFormFields({ form, setForm }: { form: TrackForm; setForm: (f: TrackForm) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Name</label>
        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Morning Track A" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Start time</label>
        <input required type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">End time</label>
        <input required type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Capacity</label>
        <input required type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="20" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Emoji <span className="text-gray-400 font-normal">(optional)</span></label>
        <input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="🎨" />
      </div>
    </div>
  );
}

function ActivityFormFields({ form, setForm, series }: { form: ActivityForm; setForm: (f: ActivityForm) => void; series: ActivitySeries[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Name</label>
        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Pottery" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Day</label>
        <DayPicker value={form.day} onChange={day => setForm({ ...form, day })} />
        {!form.day && <input type="text" required className="sr-only" tabIndex={-1} />}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Start time</label>
        <input required type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">End time</label>
        <input required type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Capacity</label>
        <input required type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="15" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Emoji <span className="text-gray-400 font-normal">(optional)</span></label>
        <input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="🏺" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Series <span className="text-gray-400 font-normal">(optional)</span></label>
        <select value={form.series_id} onChange={e => setForm({ ...form, series_id: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
          <option value="">None</option>
          {series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
    </div>
  );
}

function SeriesFormFields({ form, setForm }: { form: SeriesForm; setForm: (f: SeriesForm) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Pottery (2-part)" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
      </div>
    </div>
  );
}

function trackToForm(t: Track): TrackForm {
  return { name: t.name, description: t.description ?? "", capacity: String(t.capacity), start_time: t.start_time, end_time: t.end_time, emoji: t.emoji ?? "" };
}
function activityToForm(a: Activity): ActivityForm {
  return { name: a.name, description: a.description ?? "", capacity: String(a.capacity), day: a.day, start_time: a.start_time, end_time: a.end_time, emoji: a.emoji ?? "", series_id: a.series_id ?? "" };
}
function seriesToForm(s: ActivitySeries): SeriesForm {
  return { name: s.name, description: s.description ?? "" };
}

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

  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editTrackForm, setEditTrackForm] = useState(EMPTY_TRACK);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editActivityForm, setEditActivityForm] = useState(EMPTY_ACTIVITY);
  const [editingSeries, setEditingSeries] = useState<ActivitySeries | null>(null);
  const [editSeriesForm, setEditSeriesForm] = useState(EMPTY_SERIES);

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

  useEffect(() => { loadTracks(); loadActivities(); loadSeries(); }, [campId]);

  async function handleCreate(url: string, body: object, onSuccess: () => void) {
    setSaving(true); setError(null);
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, camp_id: campId }) });
    if (res.ok) onSuccess();
    else { const d = await res.json(); setError(d.error ?? "Failed to create."); }
    setSaving(false);
  }

  async function handleSave(url: string, body: object, onSuccess: () => void) {
    setSaving(true); setError(null);
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) onSuccess();
    else { const d = await res.json(); setError(d.error ?? "Failed to save."); }
    setSaving(false);
  }

  async function handleDelete(url: string, message: string, onSuccess: () => void) {
    if (!confirm(message)) return;
    await fetch(url, { method: "DELETE" });
    onSuccess();
  }

  const TAB = (t: Tab) => `px-4 py-2 text-sm font-medium border-b-2 ${tab === t ? "border-black text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"}`;
  const btnPrimary = "bg-black text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50";
  const btnSecondary = "text-sm text-gray-600 hover:text-gray-900 underline";
  const btnDanger = "text-sm text-red-600 hover:text-red-800 underline";
  const formCard = "mb-6 p-5 bg-white border border-gray-200 rounded-lg space-y-3";
  const card = "p-4 bg-white border border-gray-200 rounded-lg";

  return (
    <div>
      <div className="mb-6">
        <a href="/admin/camps" className="text-sm text-gray-500 hover:text-gray-900">← Camps</a>
      </div>

      <div className="flex gap-0 border-b border-gray-200 mb-6">
        <button className={TAB("tracks")} onClick={() => setTab("tracks")}>Tracks</button>
        <button className={TAB("activities")} onClick={() => setTab("activities")}>Activities</button>
        <button className={TAB("series")} onClick={() => setTab("series")}>Series</button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      {/* ── TRACKS ── */}
      {tab === "tracks" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Tracks</h2>
            <button onClick={() => { setShowTrackForm(!showTrackForm); setEditingTrack(null); }} className={btnPrimary}>
              {showTrackForm ? "Cancel" : "New track"}
            </button>
          </div>

          {showTrackForm && (
            <form className={formCard} onSubmit={e => { e.preventDefault(); handleCreate("/api/admin/tracks", trackForm, () => { setTrackForm(EMPTY_TRACK); setShowTrackForm(false); loadTracks(); }); }}>
              <TrackFormFields form={trackForm} setForm={setTrackForm} />
              <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Creating…" : "Create track"}</button>
            </form>
          )}

          {tracks.length === 0 ? <p className="text-sm text-gray-500">No tracks yet.</p> : (
            <div className="space-y-2">
              {tracks.map(t => editingTrack?.id === t.id ? (
                <form key={t.id} className={formCard} onSubmit={e => { e.preventDefault(); handleSave(`/api/admin/tracks/${t.id}`, editTrackForm, () => { setEditingTrack(null); loadTracks(); }); }}>
                  <TrackFormFields form={editTrackForm} setForm={setEditTrackForm} />
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</button>
                    <button type="button" onClick={() => setEditingTrack(null)} className={btnSecondary}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div key={t.id} className={`${card} flex items-start justify-between`}>
                  <div>
                    <p className="font-medium">{t.emoji ? `${t.emoji} ` : ""}{t.name}</p>
                    <p className="text-sm text-gray-500">{formatTime(t.start_time)} – {formatTime(t.end_time)} · Capacity {t.capacity}</p>
                    {t.description && <p className="text-sm text-gray-500">{t.description}</p>}
                  </div>
                  <div className="flex gap-3 ml-4 shrink-0">
                    <button onClick={() => { setEditingTrack(t); setEditTrackForm(trackToForm(t)); setShowTrackForm(false); }} className={btnSecondary}>Edit</button>
                    <button onClick={() => handleDelete(`/api/admin/tracks/${t.id}`, "Delete this track? Campers assigned to it will lose their track assignment.", loadTracks)} className={btnDanger}>Delete</button>
                  </div>
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
            <button onClick={() => { setShowActivityForm(!showActivityForm); setEditingActivity(null); }} className={btnPrimary}>
              {showActivityForm ? "Cancel" : "New activity"}
            </button>
          </div>

          {showActivityForm && (
            <form className={formCard} onSubmit={e => { e.preventDefault(); if (!activityForm.day) { setError("Please select a day."); return; } handleCreate("/api/admin/activities", activityForm, () => { setActivityForm(EMPTY_ACTIVITY); setShowActivityForm(false); loadActivities(); }); }}>
              <ActivityFormFields form={activityForm} setForm={setActivityForm} series={series} />
              <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Creating…" : "Create activity"}</button>
            </form>
          )}

          {activities.length === 0 ? <p className="text-sm text-gray-500">No activities yet.</p> : (
            <div className="space-y-2">
              {activities.map(a => editingActivity?.id === a.id ? (
                <form key={a.id} className={formCard} onSubmit={e => { e.preventDefault(); if (!editActivityForm.day) { setError("Please select a day."); return; } handleSave(`/api/admin/activities/${a.id}`, editActivityForm, () => { setEditingActivity(null); loadActivities(); }); }}>
                  <ActivityFormFields form={editActivityForm} setForm={setEditActivityForm} series={series} />
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</button>
                    <button type="button" onClick={() => setEditingActivity(null)} className={btnSecondary}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div key={a.id} className={`${card} flex items-start justify-between`}>
                  <div>
                    <p className="font-medium">{a.emoji ? `${a.emoji} ` : ""}{a.name}</p>
                    <p className="text-sm text-gray-500">{a.day} · {formatTime(a.start_time)} – {formatTime(a.end_time)} · Capacity {a.capacity}</p>
                    {a.series_id && <p className="text-sm text-gray-500">Series: {series.find(s => s.id === a.series_id)?.name ?? "—"}</p>}
                    {a.description && <p className="text-sm text-gray-500">{a.description}</p>}
                  </div>
                  <div className="flex gap-3 ml-4 shrink-0">
                    <button onClick={() => { setEditingActivity(a); setEditActivityForm(activityToForm(a)); setShowActivityForm(false); }} className={btnSecondary}>Edit</button>
                    <button onClick={() => handleDelete(`/api/admin/activities/${a.id}`, "Delete this activity? All registrations for it will be removed.", loadActivities)} className={btnDanger}>Delete</button>
                  </div>
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
            <button onClick={() => { setShowSeriesForm(!showSeriesForm); setEditingSeries(null); }} className={btnPrimary}>
              {showSeriesForm ? "Cancel" : "New series"}
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">Create a series first, then assign activities to it. Campers who pick one activity in a series are auto-enrolled in all others.</p>

          {showSeriesForm && (
            <form className={formCard} onSubmit={e => { e.preventDefault(); handleCreate("/api/admin/series", seriesForm, () => { setSeriesForm(EMPTY_SERIES); setShowSeriesForm(false); loadSeries(); }); }}>
              <SeriesFormFields form={seriesForm} setForm={setSeriesForm} />
              <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Creating…" : "Create series"}</button>
            </form>
          )}

          {series.length === 0 ? <p className="text-sm text-gray-500">No series yet.</p> : (
            <div className="space-y-2">
              {series.map(s => editingSeries?.id === s.id ? (
                <form key={s.id} className={formCard} onSubmit={e => { e.preventDefault(); handleSave(`/api/admin/series/${s.id}`, editSeriesForm, () => { setEditingSeries(null); loadSeries(); }); }}>
                  <SeriesFormFields form={editSeriesForm} setForm={setEditSeriesForm} />
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</button>
                    <button type="button" onClick={() => setEditingSeries(null)} className={btnSecondary}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div key={s.id} className={`${card} flex items-start justify-between`}>
                  <div>
                    <p className="font-medium">{s.name}</p>
                    {s.description && <p className="text-sm text-gray-500">{s.description}</p>}
                    {(() => { const linked = activities.filter(a => a.series_id === s.id); return linked.length > 0 ? <p className="text-sm text-gray-500">{linked.map(a => a.name).join(", ")}</p> : null; })()}
                  </div>
                  <div className="flex gap-3 ml-4 shrink-0">
                    <button onClick={() => { setEditingSeries(s); setEditSeriesForm(seriesToForm(s)); setShowSeriesForm(false); }} className={btnSecondary}>Edit</button>
                    <button onClick={() => handleDelete(`/api/admin/series/${s.id}`, "Delete this series? Activities in it will become standalone.", loadSeries)} className={btnDanger}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
