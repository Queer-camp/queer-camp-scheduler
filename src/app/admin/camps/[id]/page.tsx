"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Track, Activity, ActivitySeries } from "@/types/database";
import { formatTime } from "@/lib/format";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { ShortcutBadge } from "@/components/admin/ShortcutBadge";

type Tab = "tracks" | "activities" | "series";

type RosterTarget = { type: "track" | "activity"; id: string; name: string; capacity: number };
type RosterCamper = { id: string; chosen_first_name: string; chosen_last_name: string; pronouns: string | null; registration_id?: string; current_track_name?: string | null };
type RosterData = { capacity: number; enrolled: number; campers: RosterCamper[]; available: RosterCamper[] };

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function daysInRange(startDate: string, endDate: string): string[] {
  const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const diffDays = (end.getTime() - start.getTime()) / 86400000;
  if (diffDays >= 6) return ALL_DAYS;
  const available = new Set<string>();
  const cur = new Date(start);
  while (cur <= end) { available.add(DOW[cur.getDay()]); cur.setDate(cur.getDate() + 1); }
  return ALL_DAYS.filter(d => available.has(d));
}

const EMPTY_TRACK = { name: "", description: "", capacity: "", start_time: "09:00", end_time: "12:00", emoji: "" };
const EMPTY_ACTIVITY = { name: "", description: "", capacity: "", day: "", start_time: "09:00", end_time: "12:00", emoji: "", series_id: "" };
const EMPTY_SERIES = { name: "", description: "" };

type TrackForm = typeof EMPTY_TRACK;
type ActivityForm = typeof EMPTY_ACTIVITY;
type SeriesForm = typeof EMPTY_SERIES;

// ── Time picker (always 12h, works across all browsers/locales) ───────────────

function to12h(time: string): { hour: number; minute: number; ampm: "AM" | "PM" } {
  const [h, m] = time ? time.split(":").map(Number) : [9, 0];
  return { hour: h % 12 || 12, minute: m, ampm: h >= 12 ? "PM" : "AM" };
}

function to24h(hour: number, minute: number, ampm: "AM" | "PM"): string {
  const h = (hour % 12) + (ampm === "PM" ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function TimePicker({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  const { hour, minute, ampm } = to12h(value);
  const update = (h: number, m: number, ap: "AM" | "PM") => onChange(to24h(h, m, ap));
  const cls = "border border-gray-300 dark:border-gray-600 rounded px-2 py-2 text-sm dark:bg-gray-800 dark:text-gray-100";
  return (
    <div className="flex items-center gap-1">
      <select required={required && !value} value={hour} onChange={e => update(Number(e.target.value), minute, ampm)} className={cls}>
        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-gray-500 dark:text-gray-400">:</span>
      <select value={minute} onChange={e => update(hour, Number(e.target.value), ampm)} className={cls}>
        {Array.from({ length: 60 }, (_, i) => i).map(m => (
          <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
        ))}
      </select>
      <select value={ampm} onChange={e => update(hour, minute, e.target.value as "AM" | "PM")} className={cls}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

// ── Day picker (multi-select, stored as comma-separated string) ───────────────

function parseDays(day: string): string[] {
  return day ? day.split(",").map(d => d.trim()).filter(Boolean) : [];
}

function DayPicker({ value, onChange, availableDays }: { value: string; onChange: (day: string) => void; availableDays: string[] }) {
  const selected = parseDays(value);
  function toggle(day: string) {
    const next = selected.includes(day) ? selected.filter(d => d !== day) : [...selected, day];
    onChange(next.join(","));
  }
  return (
    <div className="flex flex-wrap gap-1">
      {ALL_DAYS.map(day => {
        const available = availableDays.includes(day);
        const on = selected.includes(day);
        return (
          <button key={day} type="button" onClick={() => available && toggle(day)}
            disabled={!available}
            title={!available ? "This day is outside the camp date range" : undefined}
            className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
              !available
                ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700"
                : on
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:border-gray-400"
            }`}>
            {day.slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}

// ── Shared form field components ──────────────────────────────────────────────

function TrackFormFields({ form, setForm }: { form: TrackForm; setForm: (f: TrackForm) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Name</label>
        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" placeholder="Morning Track A" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Description <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Start time</label>
        <TimePicker value={form.start_time} onChange={v => setForm({ ...form, start_time: v })} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">End time</label>
        <TimePicker value={form.end_time} onChange={v => setForm({ ...form, end_time: v })} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Capacity</label>
        <input required type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" placeholder="20" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Emoji <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
        <input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" placeholder="🎨" />
      </div>
    </div>
  );
}

function ActivityFormFields({ form, setForm, series, availableDays }: { form: ActivityForm; setForm: (f: ActivityForm) => void; series: ActivitySeries[]; availableDays: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Name</label>
        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" placeholder="Pottery" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Description <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Days</label>
        <DayPicker value={form.day} onChange={day => setForm({ ...form, day })} availableDays={availableDays} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Start time</label>
        <TimePicker value={form.start_time} onChange={v => setForm({ ...form, start_time: v })} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">End time</label>
        <TimePicker value={form.end_time} onChange={v => setForm({ ...form, end_time: v })} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Capacity</label>
        <input required type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" placeholder="15" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Emoji <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
        <input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" placeholder="🏺" />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium mb-1">Series <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
        <select value={form.series_id} onChange={e => setForm({ ...form, series_id: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100">
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
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" placeholder="Pottery (2-part)" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" />
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

// ── Page ──────────────────────────────────────────────────────────────────────

type TrackWithCount = Track & { enrolled: number };
type ActivityWithCount = Activity & { enrolled: number };

export default function CampDetailPage() {
  const { id: campId } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("tracks");
  const [campName, setCampName] = useState("");

  useKeyboardShortcut("1", () => setTab("tracks"));
  useKeyboardShortcut("2", () => setTab("activities"));
  useKeyboardShortcut("3", () => setTab("series"));
  const [availableDays, setAvailableDays] = useState<string[]>(ALL_DAYS);

  const [tracks, setTracks] = useState<TrackWithCount[]>([]);
  const [activities, setActivities] = useState<ActivityWithCount[]>([]);
  const [series, setSeries] = useState<ActivitySeries[]>([]);

  const [rosterTarget, setRosterTarget] = useState<RosterTarget | null>(null);
  const [rosterData, setRosterData] = useState<RosterData | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [addingCamper, setAddingCamper] = useState("");
  const [addingBusy, setAddingBusy] = useState(false);
  const [movingCamperId, setMovingCamperId] = useState<string | null>(null);
  const [movingBusy, setMovingBusy] = useState(false);

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

  async function loadRoster(target: RosterTarget) {
    setRosterLoading(true);
    setRosterError(null);
    const res = await fetch(`/api/admin/${target.type === "track" ? "tracks" : "activities"}/${target.id}/roster`);
    if (res.ok) {
      setRosterData(await res.json());
    } else {
      setRosterError("Failed to load roster.");
    }
    setRosterLoading(false);
  }

  useEffect(() => {
    if (!rosterTarget) return;
    loadRoster(rosterTarget);
    const interval = setInterval(() => {
      loadTracks();
      loadActivities();
      loadRoster(rosterTarget);
    }, 15000);
    return () => clearInterval(interval);
  }, [rosterTarget]);

  useEffect(() => {
    fetch(`/api/admin/camps`).then(r => r.json()).then((camps: { id: string; name: string; start_date: string; end_date: string }[]) => {
      const camp = camps.find(c => c.id === campId);
      if (camp) { setCampName(camp.name); setAvailableDays(daysInRange(camp.start_date, camp.end_date)); }
    });
    loadTracks(); loadActivities(); loadSeries();
  }, [campId]);

  function openRoster(target: RosterTarget) {
    setRosterData(null);
    setAddingCamper("");
    setMovingCamperId(null);
    setRosterTarget(target);
  }

  function closeRoster() {
    setRosterTarget(null);
    setRosterData(null);
    setRosterError(null);
    setAddingCamper("");
    setMovingCamperId(null);
  }

  async function rosterMove(camperId: string, targetId: string) {
    if (!rosterTarget) return;
    setMovingBusy(true);
    setRosterError(null);
    if (rosterTarget.type === "track") {
      const res = await fetch(`/api/admin/tracks/${targetId}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camper_id: camperId }),
      });
      if (res.ok) {
        setMovingCamperId(null);
        await loadRoster(rosterTarget);
        loadTracks();
      } else {
        const d = await res.json();
        setRosterError(d.error ?? "Failed to move camper.");
      }
    } else {
      const delRes = await fetch(`/api/admin/activities/${rosterTarget.id}/roster`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camper_id: camperId }),
      });
      if (!delRes.ok) {
        const d = await delRes.json();
        setRosterError(d.error ?? "Failed to remove from current activity.");
        setMovingBusy(false);
        return;
      }
      const addRes = await fetch(`/api/admin/activities/${targetId}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ camper_id: camperId }),
      });
      if (addRes.ok) {
        setMovingCamperId(null);
        await loadRoster(rosterTarget);
        loadActivities();
      } else {
        const d = await addRes.json();
        setRosterError(d.error ?? "Failed to add to new activity.");
      }
    }
    setMovingBusy(false);
  }

  async function rosterAdd() {
    if (!rosterTarget || !addingCamper) return;
    setAddingBusy(true);
    setRosterError(null);
    const url = `/api/admin/${rosterTarget.type === "track" ? "tracks" : "activities"}/${rosterTarget.id}/roster`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camper_id: addingCamper }),
    });
    if (res.ok) {
      setAddingCamper("");
      await loadRoster(rosterTarget);
      rosterTarget.type === "track" ? loadTracks() : loadActivities();
    } else {
      const d = await res.json();
      setRosterError(d.error ?? "Failed to add camper.");
    }
    setAddingBusy(false);
  }

  async function rosterRemove(camperId: string) {
    if (!rosterTarget) return;
    setRosterError(null);
    const url = `/api/admin/${rosterTarget.type === "track" ? "tracks" : "activities"}/${rosterTarget.id}/roster`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ camper_id: camperId }),
    });
    if (res.ok) {
      await loadRoster(rosterTarget);
      rosterTarget.type === "track" ? loadTracks() : loadActivities();
    } else {
      const d = await res.json();
      setRosterError(d.error ?? "Failed to remove camper.");
    }
  }

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

  const TAB = (t: Tab) => `px-4 py-2 text-sm font-medium border-b-2 ${tab === t ? "border-black dark:border-white text-gray-900 dark:text-white" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"}`;
  const btnPrimary = "bg-black text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50";
  const btnSecondary = "text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline";
  const btnDanger = "text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline";
  const btnRoster = "text-sm text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-200 font-medium underline";
  const formCard = "mb-6 p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3";
  const card = "p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg";

  function EnrollCount({ enrolled, capacity }: { enrolled: number; capacity: number }) {
    const pct = Math.min(enrolled / capacity, 1);
    const color = pct >= 1 ? "bg-red-500" : pct >= 0.8 ? "bg-yellow-500" : "bg-green-500";
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <span className={`block h-full ${color} rounded-full transition-all`} style={{ width: `${pct * 100}%` }} />
        </span>
        {enrolled}/{capacity}
      </span>
    );
  }

  function formatDays(day: string) {
    return parseDays(day).join(", ") || "—";
  }

  return (
    <div>
      <div className="mb-6">
        <a href="/admin/camps" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">← Camps</a>
        {campName && <h1 className="text-xl font-bold mt-2">{campName}</h1>}
      </div>

      <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 mb-6">
        <button className={TAB("tracks")} onClick={() => setTab("tracks")}>Tracks<ShortcutBadge>1</ShortcutBadge></button>
        <button className={TAB("activities")} onClick={() => setTab("activities")}>Activities<ShortcutBadge>2</ShortcutBadge></button>
        <button className={TAB("series")} onClick={() => setTab("series")}>Series<ShortcutBadge>3</ShortcutBadge></button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-3 rounded">{error}</p>}

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

          {tracks.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No tracks yet.</p> : (
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
                  <div className="space-y-1">
                    <p className="font-medium">{t.emoji ? `${t.emoji} ` : ""}{t.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatTime(t.start_time)} – {formatTime(t.end_time)}</p>
                    {t.description && <p className="text-sm text-gray-500 dark:text-gray-400">{t.description}</p>}
                    <EnrollCount enrolled={t.enrolled} capacity={t.capacity} />
                  </div>
                  <div className="flex gap-3 ml-4 shrink-0">
                    <button onClick={() => openRoster({ type: "track", id: t.id, name: t.name, capacity: t.capacity })} className={btnRoster}>Roster</button>
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
            <form className={formCard} onSubmit={e => {
              e.preventDefault();
              if (!activityForm.day) { setError("Please select at least one day."); return; }
              handleCreate("/api/admin/activities", activityForm, () => { setActivityForm(EMPTY_ACTIVITY); setShowActivityForm(false); loadActivities(); });
            }}>
              <ActivityFormFields form={activityForm} setForm={setActivityForm} series={series} availableDays={availableDays} />
              <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Creating…" : "Create activity"}</button>
            </form>
          )}

          {activities.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No activities yet.</p> : (
            <div className="space-y-2">
              {activities.map(a => editingActivity?.id === a.id ? (
                <form key={a.id} className={formCard} onSubmit={e => {
                  e.preventDefault();
                  if (!editActivityForm.day) { setError("Please select at least one day."); return; }
                  handleSave(`/api/admin/activities/${a.id}`, editActivityForm, () => { setEditingActivity(null); loadActivities(); });
                }}>
                  <ActivityFormFields form={editActivityForm} setForm={setEditActivityForm} series={series} availableDays={availableDays} />
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save"}</button>
                    <button type="button" onClick={() => setEditingActivity(null)} className={btnSecondary}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div key={a.id} className={`${card} flex items-start justify-between`}>
                  <div className="space-y-1">
                    <p className="font-medium">{a.emoji ? `${a.emoji} ` : ""}{a.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatDays(a.day)} · {formatTime(a.start_time)} – {formatTime(a.end_time)}</p>
                    {a.series_id && <p className="text-sm text-gray-500 dark:text-gray-400">Series: {series.find(s => s.id === a.series_id)?.name ?? "—"}</p>}
                    {a.description && <p className="text-sm text-gray-500 dark:text-gray-400">{a.description}</p>}
                    <EnrollCount enrolled={a.enrolled} capacity={a.capacity} />
                  </div>
                  <div className="flex gap-3 ml-4 shrink-0">
                    <button onClick={() => openRoster({ type: "activity", id: a.id, name: a.name, capacity: a.capacity })} className={btnRoster}>Roster</button>
                    <button onClick={() => { setEditingActivity(a); setEditActivityForm(activityToForm(a)); setShowActivityForm(false); }} className={btnSecondary}>Edit</button>
                    <button onClick={() => handleDelete(`/api/admin/activities/${a.id}`, "Delete this activity? All registrations for it will be removed.", loadActivities)} className={btnDanger}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ROSTER PANEL ── */}
      {rosterTarget && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closeRoster} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">
                  {rosterTarget.type === "track" ? "Track" : "Activity"} Roster
                </p>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{rosterTarget.name}</h2>
                {rosterData && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          rosterData.enrolled >= rosterData.capacity ? "bg-red-500" :
                          rosterData.enrolled / rosterData.capacity >= 0.8 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(rosterData.enrolled / rosterData.capacity, 1) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {rosterData.enrolled} / {rosterData.capacity} enrolled
                    </span>
                    {rosterData.enrolled < rosterData.capacity && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        ({rosterData.capacity - rosterData.enrolled} left)
                      </span>
                    )}
                    {rosterData.enrolled >= rosterData.capacity && (
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">Full</span>
                    )}
                  </div>
                )}
              </div>
              <button onClick={closeRoster} className="ml-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none shrink-0">✕</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {rosterLoading && !rosterData && (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
              )}
              {rosterError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-3 rounded">{rosterError}</p>
              )}

              {rosterData && (
                <>
                  {/* Enrolled campers */}
                  {rosterData.campers.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No one enrolled yet.</p>
                  ) : (
                    <ul className="space-y-0.5">
                      {rosterData.campers.map(c => (
                        <li key={c.id} className="group rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex items-center justify-between py-2 px-3">
                            <div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {c.chosen_first_name} {c.chosen_last_name}
                              </span>
                              {c.pronouns && (
                                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{c.pronouns}</span>
                              )}
                            </div>
                            {movingCamperId !== c.id && (
                              <div className="flex gap-3 ml-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => { setMovingCamperId(c.id); setRosterError(null); }}
                                  className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 font-medium"
                                >
                                  Move →
                                </button>
                                <button
                                  onClick={() => rosterRemove(c.id)}
                                  className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                          {movingCamperId === c.id && (
                            <div className="flex items-center gap-2 px-3 pb-2">
                              <select
                                autoFocus
                                defaultValue=""
                                disabled={movingBusy}
                                onChange={e => { if (e.target.value) rosterMove(c.id, e.target.value); }}
                                className="flex-1 border border-purple-300 dark:border-purple-700 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 min-w-0 focus:outline-none focus:ring-2 focus:ring-purple-400"
                              >
                                <option value="" disabled>Move to…</option>
                                {rosterTarget.type === "track"
                                  ? tracks.filter(t => t.id !== rosterTarget.id).map(t => (
                                      <option key={t.id} value={t.id}>
                                        {t.emoji ? `${t.emoji} ` : ""}{t.name} ({t.enrolled}/{t.capacity})
                                      </option>
                                    ))
                                  : activities.filter(a => a.id !== rosterTarget.id).map(a => (
                                      <option key={a.id} value={a.id}>
                                        {a.emoji ? `${a.emoji} ` : ""}{a.name}
                                      </option>
                                    ))
                                }
                              </select>
                              <button
                                onClick={() => setMovingCamperId(null)}
                                disabled={movingBusy}
                                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 shrink-0 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Add camper */}
                  {rosterData.available.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {rosterTarget.type === "track" ? "Add or move a camper" : "Add a camper"}
                      </p>
                      <div className="flex gap-2">
                        <select
                          value={addingCamper}
                          onChange={e => setAddingCamper(e.target.value)}
                          className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 min-w-0"
                        >
                          <option value="">Select a camper…</option>
                          {rosterData.available.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.chosen_first_name} {c.chosen_last_name}
                              {c.pronouns ? ` (${c.pronouns})` : ""}
                              {c.current_track_name ? ` — currently: ${c.current_track_name}` : ""}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={rosterAdd}
                          disabled={!addingCamper || addingBusy}
                          className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50 shrink-0"
                        >
                          {addingBusy ? "Adding…" : rosterTarget.type === "track" ? "Add / Move" : "Add"}
                        </button>
                      </div>
                    </div>
                  )}

                  {rosterData.available.length === 0 && rosterData.campers.length > 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic border-t border-gray-200 dark:border-gray-700 pt-4">
                      All campers in this camp are already enrolled.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </>
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Create a series first, then assign activities to it. Campers who pick one activity in a series are auto-enrolled in all others.</p>

          {showSeriesForm && (
            <form className={formCard} onSubmit={e => { e.preventDefault(); handleCreate("/api/admin/series", seriesForm, () => { setSeriesForm(EMPTY_SERIES); setShowSeriesForm(false); loadSeries(); }); }}>
              <SeriesFormFields form={seriesForm} setForm={setSeriesForm} />
              <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Creating…" : "Create series"}</button>
            </form>
          )}

          {series.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No series yet.</p> : (
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
                    {s.description && <p className="text-sm text-gray-500 dark:text-gray-400">{s.description}</p>}
                    {(() => { const linked = activities.filter(a => a.series_id === s.id); return linked.length > 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">{linked.map(a => a.name).join(", ")}</p> : null; })()}
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
