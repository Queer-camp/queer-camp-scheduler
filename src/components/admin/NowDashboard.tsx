"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/format";
import type { Track, Activity, StandingEvent } from "@/types/database";

export type RosterCamper = { id: string; name: string; pronouns: string | null };

type TrackWithCampers = Track & { campers: RosterCamper[] };
type ActivityWithCampers = Activity & { campers: RosterCamper[] };

export type NowData = {
  campName: string;
  campStartDate: string;
  campEndDate: string;
  totalCampers: number;
  tracks: TrackWithCampers[];
  activities: ActivityWithCampers[];
  standingEvents: StandingEvent[];
};

const ALL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const NEXT_UP_WINDOW_MIN = 30;

function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function parseDays(day: string): string[] {
  return day ? day.split(",").map(d => d.trim()).filter(Boolean) : [];
}

function inDateRange(now: Date, startISO: string, endISO: string): boolean {
  const d = now.toISOString().slice(0, 10);
  return d >= startISO && d <= endISO;
}

function fmtRemaining(mins: number): string {
  if (mins <= 0) return "ending now";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min left`;
  if (m === 0) return `${h}h left`;
  return `${h}h ${m}m left`;
}

function fmtUntil(mins: number): string {
  if (mins <= 0) return "starting now";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `in ${m} min`;
  if (m === 0) return `in ${h}h`;
  return `in ${h}h ${m}m`;
}

export function NowDashboard({ data }: { data: NowData }) {
  const router = useRouter();
  const [now, setNow] = useState<Date>(() => new Date());

  // Tick clock every 30s — only when tab is visible
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (id) return;
      setNow(new Date());
      id = setInterval(() => setNow(new Date()), 30_000);
    }
    function stop() {
      if (id) { clearInterval(id); id = null; }
    }
    function onVis() { (document.visibilityState === "visible") ? start() : stop(); }
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  // Refresh server data every 5 min — only when tab is visible
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (id) return;
      router.refresh();
      id = setInterval(() => router.refresh(), 300_000);
    }
    function stop() {
      if (id) { clearInterval(id); id = null; }
    }
    function onVis() { (document.visibilityState === "visible") ? start() : stop(); }
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [router]);

  const today = ALL_DAYS[now.getDay()];
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const inCamp = inDateRange(now, data.campStartDate, data.campEndDate);

  const { current, upcoming } = useMemo(() => {
    type Item =
      | { kind: "standing"; event: StandingEvent; start: number; end: number }
      | { kind: "track"; item: TrackWithCampers; start: number; end: number }
      | { kind: "activity"; item: ActivityWithCampers; start: number; end: number };

    const items: Item[] = [];

    for (const ev of data.standingEvents) {
      if (!parseDays(ev.day).includes(today)) continue;
      items.push({ kind: "standing", event: ev, start: timeToMins(ev.start_time), end: timeToMins(ev.end_time) });
    }
    for (const t of data.tracks) {
      // Tracks run every camp day
      items.push({ kind: "track", item: t, start: timeToMins(t.start_time), end: timeToMins(t.end_time) });
    }
    for (const a of data.activities) {
      if (!parseDays(a.day).includes(today)) continue;
      items.push({ kind: "activity", item: a, start: timeToMins(a.start_time), end: timeToMins(a.end_time) });
    }

    const current = items
      .filter(i => i.start <= nowMins && i.end > nowMins)
      .sort((a, b) => a.start - b.start);

    const upcoming = items
      .filter(i => i.start > nowMins && i.start - nowMins <= NEXT_UP_WINDOW_MIN)
      .sort((a, b) => a.start - b.start);

    return { current, upcoming };
  }, [data, today, nowMins]);

  const timeStr = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{data.campName}</p>
        <div className="flex items-baseline gap-3 mt-1 flex-wrap">
          <h1 className="text-3xl font-bold">Right Now</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">{timeStr} · {dateStr}</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{data.totalCampers} camper{data.totalCampers === 1 ? "" : "s"} registered</p>
      </div>

      {!inCamp && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-200">
          Today is outside the active camp dates ({data.campStartDate} – {data.campEndDate}).
        </div>
      )}

      {/* Currently happening */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Happening now</h2>
        {current.length === 0 ? (
          <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 italic">
            Nothing scheduled right now.
          </div>
        ) : (
          <div className="space-y-3">
            {current.map((it, i) => {
              const remaining = it.end - nowMins;
              if (it.kind === "standing") {
                return <CardStanding key={`s-${i}`} ev={it.event} remaining={remaining} totalCampers={data.totalCampers} />;
              }
              if (it.kind === "track") {
                return <CardTrack key={`t-${i}`} t={it.item} remaining={remaining} />;
              }
              return <CardActivity key={`a-${i}`} a={it.item} remaining={remaining} />;
            })}
          </div>
        )}
      </section>

      {/* Up next */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Up next (within 30 min)</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nothing coming up soon.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((it, i) => {
              const until = it.start - nowMins;
              const label = it.kind === "standing" ? it.event.name
                : it.kind === "track" ? it.item.name
                : it.item.name;
              const emoji = it.kind === "standing" ? it.event.emoji
                : it.kind === "track" ? it.item.emoji
                : it.item.emoji;
              const startTime = it.kind === "standing" ? it.event.start_time
                : it.kind === "track" ? it.item.start_time
                : it.item.start_time;
              const location = it.kind === "track" ? it.item.location
                : it.kind === "activity" ? it.item.location
                : null;
              const badgeCls = it.kind === "standing"
                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                : it.kind === "track"
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                  : "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300";
              return (
                <div key={`u-${i}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${badgeCls}`}>
                    {it.kind}
                  </span>
                  <span className="font-medium text-sm">
                    {emoji ? `${emoji} ` : ""}{label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(startTime)}{location ? ` · 📍 ${location}` : ""}</span>
                  <span className="ml-auto text-xs font-medium text-gray-600 dark:text-gray-400">{fmtUntil(until)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="mt-10 text-xs text-gray-400 dark:text-gray-500">
        Auto-refreshes every 5 minutes when tab is visible
      </p>
    </div>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────────────

function CardStanding({ ev, remaining, totalCampers }: { ev: StandingEvent; remaining: number; totalCampers: number }) {
  return (
    <div className="p-5 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Standing Event</span>
          <h3 className="text-xl font-bold mt-0.5 text-amber-900 dark:text-amber-100">
            {ev.emoji ? `${ev.emoji} ` : ""}{ev.name}
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-300 mt-0.5">
            {formatTime(ev.start_time)} – {formatTime(ev.end_time)} · all {totalCampers} camper{totalCampers === 1 ? "" : "s"}
          </p>
        </div>
        <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{fmtRemaining(remaining)}</span>
      </div>
    </div>
  );
}

function CardTrack({ t, remaining }: { t: TrackWithCampers; remaining: number }) {
  return (
    <div className="p-5 rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">Track</span>
          <h3 className="text-xl font-bold mt-0.5 text-blue-900 dark:text-blue-100">
            {t.emoji ? `${t.emoji} ` : ""}{t.name}
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-300 mt-0.5">
            {formatTime(t.start_time)} – {formatTime(t.end_time)}
            {t.location && <> · 📍 {t.location}</>}
            {" · "}{t.campers.length}/{t.capacity} enrolled
          </p>
        </div>
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">{fmtRemaining(remaining)}</span>
      </div>
      <CamperList campers={t.campers} accent="blue" />
    </div>
  );
}

function CardActivity({ a, remaining }: { a: ActivityWithCampers; remaining: number }) {
  return (
    <div className="p-5 rounded-xl border-2 border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-400">Activity</span>
          <h3 className="text-xl font-bold mt-0.5 text-purple-900 dark:text-purple-100">
            {a.emoji ? `${a.emoji} ` : ""}{a.name}
          </h3>
          <p className="text-sm text-purple-800 dark:text-purple-300 mt-0.5">
            {formatTime(a.start_time)} – {formatTime(a.end_time)}
            {a.location && <> · 📍 {a.location}</>}
            {" · "}{a.campers.length}/{a.capacity} enrolled
          </p>
        </div>
        <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">{fmtRemaining(remaining)}</span>
      </div>
      <CamperList campers={a.campers} accent="purple" />
    </div>
  );
}

function CamperList({ campers, accent }: { campers: RosterCamper[]; accent: "blue" | "purple" }) {
  if (campers.length === 0) {
    return <p className="mt-3 text-sm italic opacity-70">No one enrolled.</p>;
  }
  const sorted = [...campers].sort((a, b) => a.name.localeCompare(b.name));
  const colorMap = {
    blue: "text-blue-900 dark:text-blue-100",
    purple: "text-purple-900 dark:text-purple-100",
  };
  return (
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
      {sorted.map((c) => (
        <div key={c.id} className={`text-sm ${colorMap[accent]}`}>
          {c.name}
          {c.pronouns && <span className="ml-1 text-xs opacity-60">({c.pronouns})</span>}
        </div>
      ))}
    </div>
  );
}
