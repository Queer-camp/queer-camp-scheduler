"use client";

import { useState, useRef, useEffect } from "react";
import type { Track, Activity, ActivitySeries, StandingEvent } from "@/types/database";
import { formatTime } from "@/lib/format";
import { findStandingEventConflicts } from "@/lib/conflicts";
import { ConflictWarning } from "@/components/admin/ConflictWarning";

// ── Types ─────────────────────────────────────────────────────────────────────

type TrackWithCount = Track & { enrolled: number };
type ActivityWithCount = Activity & { enrolled: number };
export type RosterTarget = { type: "track" | "activity"; id: string; name: string; capacity: number };

type PopoverState =
  | { kind: "create"; x: number; y: number; prefillStart: string; prefillEnd: string; prefillDay: string | null }
  | { kind: "track"; x: number; y: number; track: TrackWithCount }
  | { kind: "activity"; x: number; y: number; activity: ActivityWithCount }
  | { kind: "standing"; x: number; y: number; event: StandingEvent };

interface CampGridProps {
  tracks: TrackWithCount[];
  activities: ActivityWithCount[];
  series: ActivitySeries[];
  standingEvents: StandingEvent[];
  availableDays: string[];
  campStartDate: string;
  campId: string;
  isAdmin: boolean;
  organizers: string[];
  currentUserName?: string | null;
  onUpdate: () => void;
  onOpenRoster: (target: RosterTarget) => void;
}

function ReadOnlyField({ label, value, show }: { label: string; value: string; show: boolean }) {
  if (!show) return null;
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 dark:text-gray-200">{value || <span className="text-gray-400 dark:text-gray-500 italic">—</span>}</p>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SLOT_HEIGHT = 48;        // px per 30-min slot
const GRID_START = 0;          // midnight
const GRID_END = 24 * 60;      // midnight next day
const POPOVER_WIDTH = 340;

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseDays(day: string): string[] {
  return day ? day.split(",").map(d => d.trim()).filter(Boolean) : [];
}

function timeToY(mins: number): number {
  return Math.max(0, ((mins - GRID_START) / 30) * SLOT_HEIGHT);
}

function yToMins(y: number): number {
  return Math.round((GRID_START + (y / SLOT_HEIGHT) * 30) / 30) * 30;
}

function dateForDay(day: string, startDate: string): string | null {
  if (!startDate) return null;
  const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const start = new Date(startDate + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (DOW[d.getDay()] === day) {
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
  }
  return null;
}

const timeSlots: number[] = [];
for (let m = GRID_START; m <= GRID_END; m += 30) timeSlots.push(m);

const TOTAL_HEIGHT = timeToY(GRID_END);

function computeColumns(items: { id: string; start: number; end: number }[]): Record<string, { col: number; cols: number }> {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const result: Record<string, { col: number; cols: number }> = {};
  const groups: string[][] = [];

  for (const item of sorted) {
    let placed = false;
    for (const group of groups) {
      const last = sorted.find(i => i.id === group[group.length - 1])!;
      if (last.end <= item.start) { group.push(item.id); placed = true; break; }
    }
    if (!placed) groups.push([item.id]);
  }

  const totalCols = groups.length;
  groups.forEach((group, col) => {
    group.forEach(id => { result[id] = { col, cols: totalCols }; });
  });
  return result;
}

// ── TimePicker ────────────────────────────────────────────────────────────────

function to12h(time: string) {
  const [h, m] = time ? time.split(":").map(Number) : [9, 0];
  return { hour: h % 12 || 12, minute: m, ampm: (h >= 12 ? "PM" : "AM") as "AM" | "PM" };
}
function to24h(hour: number, minute: number, ampm: "AM" | "PM") {
  const h = (hour % 12) + (ampm === "PM" ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { hour, minute, ampm } = to12h(value);
  const update = (h: number, m: number, ap: "AM" | "PM") => onChange(to24h(h, m, ap));
  const cls = "border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 text-xs dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400";
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <select value={hour} onChange={e => update(+e.target.value, minute, ampm)} className={cls}>
        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-xs text-gray-400 dark:text-gray-500">:</span>
      <select value={minute} onChange={e => update(hour, +e.target.value, ampm)} className={cls}>
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

// ── DayPicker ─────────────────────────────────────────────────────────────────

function MiniDayPicker({ value, onChange, availableDays }: { value: string; onChange: (v: string) => void; availableDays: string[] }) {
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
          <button key={day} type="button" onClick={() => available && toggle(day)} disabled={!available}
            className={`px-1.5 py-0.5 rounded text-xs font-medium border transition-colors ${
              !available ? "opacity-30 cursor-not-allowed border-gray-200 dark:border-gray-700 text-gray-400" :
              on ? "bg-purple-600 text-white border-purple-600" :
              "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-500"
            }`}>
            {day.slice(0, 2)}
          </button>
        );
      })}
    </div>
  );
}

// ── Popover shell ─────────────────────────────────────────────────────────────

function Popover({ x, y, onClose, children }: { x: number; y: number; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useEffect(() => {
    if (!ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x + 8;
    let top = y - 8;
    if (left + width > vw - 16) left = x - width - 8;
    if (top + height > vh - 16) top = vh - height - 16;
    if (top < 8) top = 8;
    if (left < 8) left = 8;
    setPos({ left, top });
  }, [x, y]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div ref={ref} style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 60, width: POPOVER_WIDTH }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
      {children}
    </div>
  );
}

// ── Shared field styles ───────────────────────────────────────────────────────

const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-400";
const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5";

function OrganizerSelect({ value, onChange, organizers }: { value: string; onChange: (v: string) => void; organizers: string[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400">
      <option value="">— None —</option>
      {organizers.map(name => <option key={name} value={name}>{name}</option>)}
    </select>
  );
}

// ── Create Popover ────────────────────────────────────────────────────────────

function CreatePopover({
  x, y, prefillStart, prefillEnd, prefillDay,
  availableDays, series, standingEvents, campId, organizers, onClose, onCreated,
}: {
  x: number; y: number; prefillStart: string; prefillEnd: string; prefillDay: string | null;
  availableDays: string[]; series: ActivitySeries[]; standingEvents: StandingEvent[]; campId: string; organizers: string[];
  onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    itemType: "activity" as "track" | "activity",
    name: "", emoji: "", location: "", organizer: "", description: "",
    day: prefillDay ?? "", start_time: prefillStart, end_time: prefillEnd,
    capacity: "15", series_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (form.itemType === "activity" && !form.day) { setError("Select at least one day."); return; }
    setSaving(true); setError(null);
    const url = form.itemType === "track" ? "/api/admin/tracks" : "/api/admin/activities";
    const body = form.itemType === "track"
      ? { camp_id: campId, name: form.name, emoji: form.emoji, location: form.location, organizer: form.organizer, description: form.description, capacity: form.capacity, start_time: form.start_time, end_time: form.end_time }
      : { camp_id: campId, name: form.name, emoji: form.emoji, location: form.location, organizer: form.organizer, description: form.description, capacity: form.capacity, start_time: form.start_time, end_time: form.end_time, day: form.day, series_id: form.series_id };
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { onCreated(); onClose(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to create."); }
    setSaving(false);
  }

  return (
    <Popover x={x} y={y} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {(["activity", "track"] as const).map(t => (
                <button key={t} type="button" onClick={() => set("itemType", t)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    form.itemType === t ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                  }`}>
                  {t === "track" ? "Track" : "Activity"}
                </button>
              ))}
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-lg leading-none ml-2">✕</button>
          </div>
          <div className="flex gap-2">
            <input value={form.emoji} onChange={e => set("emoji", e.target.value)} placeholder="✦"
              className="w-12 text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400" />
            <input ref={nameRef} required value={form.name} onChange={e => set("name", e.target.value)}
              placeholder={form.itemType === "track" ? "Track name…" : "Activity name…"}
              className={inputCls} />
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div>
            <label className={labelCls}>Location</label>
            <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Room 4, Gym, Pavilion…" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Organizer</label>
            <OrganizerSelect value={form.organizer} onChange={v => set("organizer", v)} organizers={organizers} />
          </div>

          {form.itemType === "activity" && (
            <div>
              <label className={labelCls}>Days</label>
              <MiniDayPicker value={form.day} onChange={v => set("day", v)} availableDays={availableDays} />
            </div>
          )}

          <div>
            <label className={labelCls}>Start time</label>
            <TimePicker value={form.start_time} onChange={v => set("start_time", v)} />
          </div>
          <div>
            <label className={labelCls}>End time</label>
            <TimePicker value={form.end_time} onChange={v => set("end_time", v)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Capacity</label>
              <input required type="number" min="1" value={form.capacity} onChange={e => set("capacity", e.target.value)} className={inputCls} />
            </div>
            {form.itemType === "activity" && series.length > 0 && (
              <div>
                <label className={labelCls}>Series</label>
                <select value={form.series_id} onChange={e => set("series_id", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400">
                  <option value="">None</option>
                  {series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Description <span className="font-normal opacity-60">(optional)</span></label>
            <input value={form.description} onChange={e => set("description", e.target.value)} className={inputCls} />
          </div>

          <ConflictWarning conflicts={findStandingEventConflicts(
            form.start_time, form.end_time,
            form.itemType === "track" ? availableDays : (form.day ? form.day.split(",").map(d => d.trim()).filter(Boolean) : []),
            standingEvents,
          )} />

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="px-4 pb-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-1.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition-colors">
            {saving ? "Creating…" : `Create ${form.itemType}`}
          </button>
        </div>
      </form>
    </Popover>
  );
}

// ── Track Detail Popover ──────────────────────────────────────────────────────

function TrackPopover({
  x, y, track, availableDays, standingEvents, organizers, isAdmin, onClose, onUpdate, onOpenRoster,
}: {
  x: number; y: number; track: TrackWithCount;
  availableDays: string[]; standingEvents: StandingEvent[]; organizers: string[];
  isAdmin: boolean;
  onClose: () => void; onUpdate: () => void; onOpenRoster: (t: RosterTarget) => void;
}) {
  const [form, setForm] = useState({
    name: track.name, emoji: track.emoji ?? "", location: track.location ?? "",
    organizer: track.organizer ?? "",
    description: track.description ?? "", start_time: track.start_time,
    end_time: track.end_time, capacity: String(track.capacity),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pct = Math.min(track.enrolled / track.capacity, 1);
  const barColor = pct >= 1 ? "bg-red-500" : pct >= 0.8 ? "bg-yellow-500" : "bg-green-500";
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await fetch(`/api/admin/tracks/${track.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, emoji: form.emoji, location: form.location, organizer: form.organizer, description: form.description, start_time: form.start_time, end_time: form.end_time, capacity: Number(form.capacity) }),
    });
    if (res.ok) { onUpdate(); onClose(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to save."); }
    setSaving(false);
  }

  async function del() {
    if (!confirm(`Delete track "${track.name}"? Campers assigned to it will lose their track assignment.`)) return;
    await fetch(`/api/admin/tracks/${track.id}`, { method: "DELETE" });
    onUpdate(); onClose();
  }

  return (
    <Popover x={x} y={y} onClose={onClose}>
      <form onSubmit={save}>
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Track</span>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-lg leading-none">✕</button>
          </div>
          <div className="flex gap-2 mb-2">
            <input value={form.emoji} onChange={e => set("emoji", e.target.value)} placeholder="✦"
              className="w-12 text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <input required value={form.name} onChange={e => set("name", e.target.value)}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct * 100}%` }} />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{track.enrolled}/{track.capacity}</span>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          <ReadOnlyField label="Location" value={form.location} show={!isAdmin} />
          <ReadOnlyField label="Organizer" value={form.organizer} show={!isAdmin} />
          {isAdmin && <>
            <div>
              <label className={labelCls}>Location</label>
              <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Room, building…" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Organizer</label>
              <OrganizerSelect value={form.organizer} onChange={v => set("organizer", v)} organizers={organizers} />
            </div>
          </>}
          <div>
            <label className={labelCls}>Start time</label>
            {isAdmin ? <TimePicker value={form.start_time} onChange={v => set("start_time", v)} /> : <p className="text-sm text-gray-700 dark:text-gray-300">{formatTime(form.start_time)}</p>}
          </div>
          <div>
            <label className={labelCls}>End time</label>
            {isAdmin ? <TimePicker value={form.end_time} onChange={v => set("end_time", v)} /> : <p className="text-sm text-gray-700 dark:text-gray-300">{formatTime(form.end_time)}</p>}
          </div>
          {isAdmin && <div>
            <label className={labelCls}>Capacity</label>
            <input required type="number" min="1" value={form.capacity} onChange={e => set("capacity", e.target.value)} className={inputCls} />
          </div>}
          {isAdmin && <div>
            <label className={labelCls}>Description <span className="font-normal opacity-60">(optional)</span></label>
            <input value={form.description} onChange={e => set("description", e.target.value)} className={inputCls} />
          </div>}
          {isAdmin && <ConflictWarning conflicts={findStandingEventConflicts(form.start_time, form.end_time, availableDays, standingEvents)} />}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="px-4 pb-4 flex items-center justify-between">
          <div className="flex gap-3">
            <button type="button" onClick={() => { onOpenRoster({ type: "track", id: track.id, name: track.name, capacity: track.capacity }); onClose(); }}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium">Roster</button>
            {isAdmin && <button type="button" onClick={del} className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 hover:underline">Delete</button>}
          </div>
          {isAdmin && <button type="submit" disabled={saving}
            className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "Save"}
          </button>}
        </div>
      </form>
    </Popover>
  );
}

// ── Activity Detail Popover ───────────────────────────────────────────────────

function ActivityPopover({
  x, y, activity, availableDays, series, standingEvents, organizers, isAdmin, onClose, onUpdate, onOpenRoster,
}: {
  x: number; y: number; activity: ActivityWithCount;
  availableDays: string[]; series: ActivitySeries[]; standingEvents: StandingEvent[]; organizers: string[];
  isAdmin: boolean;
  onClose: () => void; onUpdate: () => void; onOpenRoster: (t: RosterTarget) => void;
}) {
  const [form, setForm] = useState({
    name: activity.name, emoji: activity.emoji ?? "", location: activity.location ?? "",
    organizer: activity.organizer ?? "",
    description: activity.description ?? "", day: activity.day,
    start_time: activity.start_time, end_time: activity.end_time,
    capacity: String(activity.capacity), series_id: activity.series_id ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pct = Math.min(activity.enrolled / activity.capacity, 1);
  const barColor = pct >= 1 ? "bg-red-500" : pct >= 0.8 ? "bg-yellow-500" : "bg-green-500";
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.day) { setError("Select at least one day."); return; }
    setSaving(true); setError(null);
    const res = await fetch(`/api/admin/activities/${activity.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, emoji: form.emoji, location: form.location, organizer: form.organizer, description: form.description, day: form.day, start_time: form.start_time, end_time: form.end_time, capacity: Number(form.capacity), series_id: form.series_id || null }),
    });
    if (res.ok) { onUpdate(); onClose(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to save."); }
    setSaving(false);
  }

  async function del() {
    if (!confirm(`Delete activity "${activity.name}"? All registrations for it will be removed.`)) return;
    await fetch(`/api/admin/activities/${activity.id}`, { method: "DELETE" });
    onUpdate(); onClose();
  }

  return (
    <Popover x={x} y={y} onClose={onClose}>
      <form onSubmit={save}>
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">Activity</span>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-lg leading-none">✕</button>
          </div>
          <div className="flex gap-2 mb-2">
            <input value={form.emoji} onChange={e => set("emoji", e.target.value)} placeholder="✦"
              className="w-12 text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400" />
            <input required value={form.name} onChange={e => set("name", e.target.value)}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct * 100}%` }} />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{activity.enrolled}/{activity.capacity}</span>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          <ReadOnlyField label="Location" value={form.location} show={!isAdmin} />
          <ReadOnlyField label="Organizer" value={form.organizer} show={!isAdmin} />
          {isAdmin && <>
            <div>
              <label className={labelCls}>Location</label>
              <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Room, building…" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Organizer</label>
              <OrganizerSelect value={form.organizer} onChange={v => set("organizer", v)} organizers={organizers} />
            </div>
          </>}
          <div>
            <label className={labelCls}>Days</label>
            {isAdmin ? <MiniDayPicker value={form.day} onChange={v => set("day", v)} availableDays={availableDays} /> : <p className="text-sm text-gray-700 dark:text-gray-300">{form.day || "—"}</p>}
          </div>
          <div>
            <label className={labelCls}>Start time</label>
            {isAdmin ? <TimePicker value={form.start_time} onChange={v => set("start_time", v)} /> : <p className="text-sm text-gray-700 dark:text-gray-300">{formatTime(form.start_time)}</p>}
          </div>
          <div>
            <label className={labelCls}>End time</label>
            {isAdmin ? <TimePicker value={form.end_time} onChange={v => set("end_time", v)} /> : <p className="text-sm text-gray-700 dark:text-gray-300">{formatTime(form.end_time)}</p>}
          </div>
          {isAdmin && <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Capacity</label>
              <input required type="number" min="1" value={form.capacity} onChange={e => set("capacity", e.target.value)} className={inputCls} />
            </div>
            {series.length > 0 && (
              <div>
                <label className={labelCls}>Series</label>
                <select value={form.series_id} onChange={e => set("series_id", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400">
                  <option value="">None</option>
                  {series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>}
          {isAdmin && <div>
            <label className={labelCls}>Description <span className="font-normal opacity-60">(optional)</span></label>
            <input value={form.description} onChange={e => set("description", e.target.value)} className={inputCls} />
          </div>}
          {isAdmin && <ConflictWarning conflicts={findStandingEventConflicts(
            form.start_time, form.end_time,
            form.day ? form.day.split(",").map(d => d.trim()).filter(Boolean) : [],
            standingEvents,
          )} />}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="px-4 pb-4 flex items-center justify-between">
          <div className="flex gap-3">
            <button type="button" onClick={() => { onOpenRoster({ type: "activity", id: activity.id, name: activity.name, capacity: activity.capacity }); onClose(); }}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium">Roster</button>
            {isAdmin && <button type="button" onClick={del} className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 hover:underline">Delete</button>}
          </div>
          {isAdmin && <button type="submit" disabled={saving}
            className="px-4 py-1.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "Save"}
          </button>}
        </div>
      </form>
    </Popover>
  );
}

// ── Standing Event Popover ────────────────────────────────────────────────────

function StandingEventPopover({
  x, y, event, availableDays, organizers, isAdmin, onClose, onUpdate,
}: {
  x: number; y: number; event: StandingEvent;
  availableDays: string[]; organizers: string[];
  isAdmin: boolean;
  onClose: () => void; onUpdate: () => void;
}) {
  const [form, setForm] = useState({
    name: event.name, emoji: event.emoji ?? "",
    location: event.location ?? "", organizer: event.organizer ?? "",
    day: event.day, start_time: event.start_time, end_time: event.end_time,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.day) { setError("Select at least one day."); return; }
    setSaving(true); setError(null);
    const res = await fetch(`/api/admin/standing-events/${event.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, emoji: form.emoji || null, location: form.location || null, organizer: form.organizer || null, day: form.day, start_time: form.start_time, end_time: form.end_time }),
    });
    if (res.ok) { onUpdate(); onClose(); }
    else { const d = await res.json(); setError(d.error ?? "Failed to save."); }
    setSaving(false);
  }

  async function del() {
    if (!confirm(`Delete "${event.name}"?`)) return;
    await fetch(`/api/admin/standing-events/${event.id}`, { method: "DELETE" });
    onUpdate(); onClose();
  }

  return (
    <Popover x={x} y={y} onClose={onClose}>
      <form onSubmit={save}>
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Standing Event</span>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-lg leading-none">✕</button>
          </div>
          <div className="flex gap-2">
            <input value={form.emoji} onChange={e => set("emoji", e.target.value)} placeholder="🍽️"
              className="w-12 text-center border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
            <input required value={form.name} onChange={e => set("name", e.target.value)}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          <ReadOnlyField label="Location" value={form.location} show={!isAdmin} />
          <ReadOnlyField label="Organizer" value={form.organizer} show={!isAdmin} />
          {isAdmin && <>
            <div>
              <label className={labelCls}>Location</label>
              <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Dining Hall…" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Organizer</label>
              <OrganizerSelect value={form.organizer} onChange={v => set("organizer", v)} organizers={organizers} />
            </div>
          </>}
          <div>
            <label className={labelCls}>Days</label>
            {isAdmin ? <MiniDayPicker value={form.day} onChange={v => set("day", v)} availableDays={availableDays} /> : <p className="text-sm text-gray-700 dark:text-gray-300">{form.day || "—"}</p>}
          </div>
          <div>
            <label className={labelCls}>Start time</label>
            {isAdmin ? <TimePicker value={form.start_time} onChange={v => set("start_time", v)} /> : <p className="text-sm text-gray-700 dark:text-gray-300">{formatTime(form.start_time)}</p>}
          </div>
          <div>
            <label className={labelCls}>End time</label>
            {isAdmin ? <TimePicker value={form.end_time} onChange={v => set("end_time", v)} /> : <p className="text-sm text-gray-700 dark:text-gray-300">{formatTime(form.end_time)}</p>}
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="px-4 pb-4 flex items-center justify-between">
          {isAdmin && <button type="button" onClick={del} className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 hover:underline">Delete</button>}
          {isAdmin ? (
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Save"}
            </button>
          ) : (
            <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
              Close
            </button>
          )}
        </div>
      </form>
    </Popover>
  );
}

// ── Main Grid ─────────────────────────────────────────────────────────────────

export function CampGrid({ tracks, activities, series, standingEvents, availableDays, campStartDate, campId, isAdmin, organizers, currentUserName, onUpdate, onOpenRoster }: CampGridProps) {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [focusDay, setFocusDay] = useState<string | null>(null);

  const days = ALL_DAYS.filter(d => availableDays.includes(d));
  const visibleDays = focusDay ? [focusDay] : days;
  const focusDayIndex = focusDay ? days.indexOf(focusDay) : -1;

  const rainbowShadow = "0 0 0 1.5px #d93025, 0 0 0 3px #f5810e, 0 0 0 4.5px #f5c23e, 0 0 0 6px #5dbb46, 0 0 0 7.5px #4b96f3, 0 0 0 9px #7c3aed";

  // Auto-scroll to 8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = timeToY(8 * 60) - 64;
    }
  }, []);

  // Current time
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Per-day activity overlap columns
  const actColsByDay: Record<string, Record<string, { col: number; cols: number }>> = {};
  for (const day of visibleDays) {
    const dayActs = activities.filter(a => parseDays(a.day).includes(day));
    actColsByDay[day] = computeColumns(dayActs.map(a => ({
      id: a.id, start: timeToMins(a.start_time), end: timeToMins(a.end_time),
    })));
  }

  // Track overlap columns — tracks run every day so compute once
  const trackCols = computeColumns(tracks.map(t => ({
    id: t.id, start: timeToMins(t.start_time), end: timeToMins(t.end_time),
  })));

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, day: string) {
    if (!isAdmin) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const clickMins = yToMins(relY);
    const snapped = Math.max(0, Math.min(GRID_END - 60, clickMins));
    setPopover({
      kind: "create", x: e.clientX, y: e.clientY,
      prefillStart: minsToTime(snapped),
      prefillEnd: minsToTime(snapped + 60),
      prefillDay: day,
    });
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3 gap-4">
        <div>
          {isAdmin && <p className="text-xs text-gray-400 dark:text-gray-500">Click any empty area to add an activity or track · Click a block to edit</p>}
          {!isAdmin && <p className="text-xs text-amber-700 dark:text-amber-400">You have read-only access and cannot edit the schedule.</p>}
        </div>
        {focusDay && (
          <button
            onClick={() => setFocusDay(null)}
            className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1 transition-colors"
          >
            All days
          </button>
        )}
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">

        {/* Day column headers */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
          {/* Prev arrow — single-day mode only */}
          {focusDay ? (
            <div className="w-16 shrink-0 flex items-center justify-center border-r border-gray-200 dark:border-gray-700">
              <button
                onClick={() => focusDayIndex > 0 && setFocusDay(days[focusDayIndex - 1])}
                disabled={focusDayIndex <= 0}
                className="p-1 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous day"
              >
                ←
              </button>
            </div>
          ) : (
            <div className="w-16 shrink-0" />
          )}

          {visibleDays.map(day => {
            const date = dateForDay(day, campStartDate);
            return focusDay ? (
              /* Single-day header — full centered label with next arrow */
              <div key={day} className="flex-1 flex items-center border-l border-gray-200 dark:border-gray-700">
                <div className="flex-1 px-2 py-2 text-center">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{day}</p>
                  {date && <p className="text-xs text-gray-400 dark:text-gray-500">{date}</p>}
                </div>
                <button
                  onClick={() => focusDayIndex < days.length - 1 && setFocusDay(days[focusDayIndex + 1])}
                  disabled={focusDayIndex >= days.length - 1}
                  className="p-1 mr-2 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next day"
                >
                  →
                </button>
              </div>
            ) : (
              /* All-days header — clickable to drill in */
              <button
                key={day}
                onClick={() => setFocusDay(day)}
                className="flex-1 min-w-28 px-2 py-2 text-center border-l border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
                title={`View ${day} only`}
              >
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white">{day.slice(0, 3)}</p>
                {date && <p className="text-xs text-gray-400 dark:text-gray-500">{date}</p>}
              </button>
            );
          })}
        </div>

        {/* Scrollable time grid */}
        <div ref={scrollRef} className="overflow-y-auto max-h-[65vh]">
          <div className="flex relative" style={{ height: TOTAL_HEIGHT }}>

            {/* Current time line — single overlay spanning all day columns */}
            <div style={{
              position: "absolute",
              top: timeToY(nowMins),
              left: 64, // after time label column
              right: 0,
              zIndex: 5,
              pointerEvents: "none",
            }} className="flex items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0" />
              <div className="flex-1 h-px bg-red-400" />
            </div>

            {/* Time labels */}
            <div className="w-16 shrink-0 relative">
              {timeSlots.map(mins => (
                mins % 60 === 0 && (
                  <div key={mins} style={{ position: "absolute", top: timeToY(mins) - 8 }}
                    className="text-right pr-2 w-full text-xs text-gray-400 dark:text-gray-500 leading-none">
                    {formatTime(minsToTime(mins))}
                  </div>
                )
              ))}
            </div>

            {/* Day columns — activities only */}
            {visibleDays.map(day => {
              const dayActs = activities.filter(a => parseDays(a.day).includes(day));
              const colMap = actColsByDay[day];

              return (
                <div key={day}
                  className="flex-1 min-w-28 border-l border-gray-200 dark:border-gray-700 relative cursor-pointer"
                  style={{ height: TOTAL_HEIGHT }}
                  onClick={e => handleColumnClick(e, day)}>

                  {/* Slot lines */}
                  {timeSlots.map(mins => (
                    <div key={mins} style={{ position: "absolute", top: timeToY(mins), width: "100%" }}
                      className={`border-t ${mins % 60 === 0 ? "border-gray-200 dark:border-gray-700" : "border-gray-100 dark:border-gray-800"}`} />
                  ))}

                  {/* Track blocks — appear in every day column at their time */}
                  {tracks.map(track => {
                    const { col, cols } = trackCols[track.id] ?? { col: 0, cols: 1 };
                    const top = timeToY(timeToMins(track.start_time));
                    const height = Math.max(24, timeToY(timeToMins(track.end_time)) - top);
                    const widthPct = 100 / cols;
                    const pct = Math.min(track.enrolled / track.capacity, 1);
                    const barColor = pct >= 1 ? "bg-red-500" : pct >= 0.8 ? "bg-yellow-500" : "bg-green-500";
                    const isMine = currentUserName && track.organizer === currentUserName;
                    return (
                      <div key={`track-${day}-${track.id}`}
                        style={{
                          position: "absolute", top, height,
                          left: `calc(${col * widthPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                          zIndex: 2,
                          boxShadow: isMine ? rainbowShadow : undefined,
                        }}
                        className={`rounded-md border border-blue-300 dark:border-blue-700 bg-blue-100 dark:bg-blue-900 px-1.5 py-1 overflow-hidden transition-[filter] cursor-pointer hover:brightness-95`}
                        onClick={e => { e.stopPropagation(); setPopover({ kind: "track", x: e.clientX, y: e.clientY, track }); }}>
                        <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 truncate leading-tight">
                          {track.emoji ? `${track.emoji} ` : ""}{track.name}
                        </p>
                        {track.location && height > 36 && (
                          <p className="text-xs text-blue-700 dark:text-blue-300 truncate leading-tight opacity-75">📍 {track.location}</p>
                        )}
                        {height > 48 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="flex-1 h-1 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                              <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct * 100}%` }} />
                            </div>
                            <span className="text-xs text-blue-700 dark:text-blue-300 opacity-70">{track.enrolled}/{track.capacity}</span>
                          </div>
                        )}
                        {isMine && <span className="absolute top-1 right-1 text-xs bg-amber-400 text-amber-900 font-semibold px-1 rounded leading-tight">You</span>}
                      </div>
                    );
                  })}

                  {/* Standing event blocks */}
                  {standingEvents.filter(ev => parseDays(ev.day).includes(day)).map(ev => {
                    const top = timeToY(timeToMins(ev.start_time));
                    const height = Math.max(24, timeToY(timeToMins(ev.end_time)) - top);
                    const isMine = currentUserName && ev.organizer === currentUserName;
                    return (
                      <div key={ev.id}
                        style={{ position: "absolute", top, height, left: 2, right: 2, zIndex: 4, boxShadow: isMine ? rainbowShadow : undefined }}
                        className={`rounded-md border border-amber-300 dark:border-amber-700 bg-amber-100/80 dark:bg-amber-900/50 px-1.5 py-1 overflow-hidden transition-[filter] cursor-pointer hover:brightness-95`}
                        onClick={e => { e.stopPropagation(); setPopover({ kind: "standing", x: e.clientX, y: e.clientY, event: ev }); }}>
                        <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 truncate leading-tight">
                          {ev.emoji ? `${ev.emoji} ` : ""}{ev.name}
                        </p>
                        {height > 36 && (
                          <p className="text-xs text-amber-700 dark:text-amber-300 leading-tight opacity-70">
                            {formatTime(ev.start_time)} – {formatTime(ev.end_time)}
                          </p>
                        )}
                        {isMine && <span className="absolute top-1 right-1 text-xs bg-amber-400 text-amber-900 font-semibold px-1 rounded leading-tight">You</span>}
                      </div>
                    );
                  })}

                  {/* Activity blocks */}
                  {dayActs.map(activity => {
                    const { col, cols } = colMap[activity.id] ?? { col: 0, cols: 1 };
                    const top = timeToY(timeToMins(activity.start_time));
                    const height = Math.max(24, timeToY(timeToMins(activity.end_time)) - top);
                    const widthPct = 100 / cols;
                    const isMine = currentUserName && activity.organizer === currentUserName;
                    return (
                      <div key={activity.id}
                        style={{
                          position: "absolute", top, height,
                          left: `calc(${col * widthPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                          zIndex: 3,
                          boxShadow: isMine ? rainbowShadow : undefined,
                        }}
                        className={`rounded-md border border-purple-300 dark:border-purple-700 bg-purple-100 dark:bg-purple-900 px-1.5 py-1 overflow-hidden transition-[filter] cursor-pointer hover:brightness-95`}
                        onClick={e => { e.stopPropagation(); setPopover({ kind: "activity", x: e.clientX, y: e.clientY, activity }); }}>
                        <p className="text-xs font-semibold text-purple-900 dark:text-purple-100 truncate leading-tight">
                          {activity.emoji ? `${activity.emoji} ` : ""}{activity.name}
                        </p>
                        {activity.location && height > 36 && (
                          <p className="text-xs text-purple-700 dark:text-purple-300 truncate leading-tight opacity-75">📍 {activity.location}</p>
                        )}
                        {height > 48 && (
                          <p className="text-xs text-purple-700 dark:text-purple-300 leading-tight opacity-60">{activity.enrolled}/{activity.capacity}</p>
                        )}
                        {isMine && <span className="absolute top-1 right-1 text-xs bg-amber-400 text-amber-900 font-semibold px-1 rounded leading-tight">You</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Popovers */}
      {popover?.kind === "create" && (
        <CreatePopover
          x={popover.x} y={popover.y}
          prefillStart={popover.prefillStart} prefillEnd={popover.prefillEnd} prefillDay={popover.prefillDay}
          availableDays={availableDays} series={series} standingEvents={standingEvents} campId={campId} organizers={organizers}
          onClose={() => setPopover(null)} onCreated={onUpdate}
        />
      )}
      {popover?.kind === "track" && (
        <TrackPopover
          x={popover.x} y={popover.y} track={popover.track}
          availableDays={availableDays} standingEvents={standingEvents} organizers={organizers}
          isAdmin={isAdmin}
          onClose={() => setPopover(null)} onUpdate={onUpdate} onOpenRoster={onOpenRoster}
        />
      )}
      {popover?.kind === "activity" && (
        <ActivityPopover
          x={popover.x} y={popover.y} activity={popover.activity}
          availableDays={availableDays} series={series} standingEvents={standingEvents} organizers={organizers}
          isAdmin={isAdmin}
          onClose={() => setPopover(null)} onUpdate={onUpdate} onOpenRoster={onOpenRoster}
        />
      )}
      {popover?.kind === "standing" && (
        <StandingEventPopover
          x={popover.x} y={popover.y} event={popover.event}
          availableDays={availableDays} organizers={organizers}
          isAdmin={isAdmin}
          onClose={() => setPopover(null)} onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
