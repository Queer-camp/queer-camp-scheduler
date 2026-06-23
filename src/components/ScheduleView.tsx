"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  ActivityWithSpots,
  TrackWithSpots,
  ActivitySeries,
  StandingEvent,
  Resource,
} from "@/types/database";
import ActivitySlots, { buildTimeSlots } from "@/components/ActivitySlots";
import { formatTime, formatDay } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Camper {
  id: string;
  chosen_first_name: string;
  chosen_last_name: string;
  pronouns: string | null;
  track_id: string | null;
}

interface Props {
  token: string;
  camper: Camper;
  campName: string;
  registeredActivityIds: string[];
  activities: ActivityWithSpots[];
  tracks: TrackWithSpots[];
  series: ActivitySeries[];
  standingEvents: StandingEvent[];
  resources: Resource[];
}

const RAINBOW = "#d93025, #f5810e, #f5c23e, #5dbb46, #4b96f3, #7c3aed, #e879a8";
const GRADIENT = "linear-gradient(to right, #e879a8, #7c3aed, #4b96f3)";

// ── Root ──────────────────────────────────────────────────────────────────────

export default function ScheduleView(props: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <EditMode {...props} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />;
  }

  return <ViewMode {...props} onEdit={() => setEditing(true)} />;
}

// ── View mode ─────────────────────────────────────────────────────────────────

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type DayItem =
  | { kind: "activity"; activity: ActivityWithSpots }
  | { kind: "standing"; event: StandingEvent };

function ViewMode({
  camper,
  campName,
  registeredActivityIds,
  activities,
  tracks,
  series,
  standingEvents,
  resources,
  onEdit,
}: Props & { onEdit: () => void }) {
  const displayName = `${camper.chosen_first_name} ${camper.chosen_last_name}`;
  const registeredIdSet = new Set(registeredActivityIds);

  const currentTrack = camper.track_id
    ? tracks.find((t) => t.id === camper.track_id)
    : null;

  const registeredActivities = useMemo(
    () =>
      activities
        .filter((a) => registeredIdSet.has(a.id))
        .sort((a, b) =>
          a.day !== b.day
            ? a.day.localeCompare(b.day)
            : a.start_time.localeCompare(b.start_time)
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activities, registeredActivityIds]
  );

  const byDay = useMemo(() => {
    const map = new Map<string, DayItem[]>();

    for (const a of registeredActivities) {
      if (!map.has(a.day)) map.set(a.day, []);
      map.get(a.day)!.push({ kind: "activity", activity: a });
    }

    for (const ev of standingEvents) {
      const days = ev.day.split(",").map((d) => d.trim()).filter(Boolean);
      for (const day of days) {
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push({ kind: "standing", event: ev });
      }
    }

    // Sort each day's items by start_time and return in week order
    for (const items of map.values()) {
      items.sort((a, b) => {
        const aTime = a.kind === "activity" ? a.activity.start_time : a.event.start_time;
        const bTime = b.kind === "activity" ? b.activity.start_time : b.event.start_time;
        return aTime.localeCompare(bTime);
      });
    }

    return ALL_DAYS.filter((d) => map.has(d)).map((d) => [d, map.get(d)!] as const);
  }, [registeredActivities, standingEvents]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 print:bg-white print:min-h-0">
      {/* Rainbow bar — hidden on print */}
      <div className="h-2 print:hidden" style={{ background: `linear-gradient(to right, ${RAINBOW})` }} />

      <div className="max-w-xl mx-auto px-4 pt-10 pb-16 print:pt-4 print:pb-4">
        {/* Logo — hidden on print */}
        <div className="flex justify-center mb-6 print:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/queer-camp-logo.png" alt="Queer Camp" className="h-20 w-auto drop-shadow-md" />
        </div>

        {/* Header */}
        <p className="text-sm text-gray-500 print:text-black mb-1">{campName}</p>
        <h1 className="text-3xl print:text-xl font-extrabold tracking-tight print:text-black mb-0.5"
          style={{ background: GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
        >
          {displayName}&apos;s Schedule
        </h1>
        {camper.pronouns && (
          <p className="text-gray-500 print:text-gray-600 text-sm mt-0.5">{camper.pronouns}</p>
        )}

        {/* Resource links */}
        {resources.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-3 print:hidden">
            {resources.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target={r.target === "new_tab" ? "_blank" : "_self"}
                rel={r.target === "new_tab" ? "noopener noreferrer" : undefined}
                className="px-4 py-1.5 rounded-full border text-sm font-medium transition-colors hover:opacity-80"
                style={{ borderColor: "#7c3aed", color: "#7c3aed" }}
              >
                {r.title}
              </a>
            ))}
          </div>
        )}

        {/* Track */}
        {currentTrack && (
          <div className="mt-6 print:hidden bg-white rounded-xl border border-gray-200 border-l-4 border-l-purple-500 overflow-hidden">
            <div className="p-4">
              <p className="text-xs font-bold text-purple-600 print:text-gray-500 uppercase tracking-wide mb-1">
                Morning Track
              </p>
              <p className="font-semibold text-gray-900 text-base">
                {currentTrack.emoji ? `${currentTrack.emoji} ` : ""}
                {currentTrack.name}
              </p>
              <p className="text-sm text-gray-600 print:text-gray-600 mt-0.5 font-medium">
                {formatTime(currentTrack.start_time)} – {formatTime(currentTrack.end_time)}
              </p>
              {currentTrack.location && (
                <p className="text-sm text-gray-600 print:text-gray-700 mt-0.5">📍 {currentTrack.location}</p>
              )}
              {currentTrack.organizers?.length > 0 && (
                <p className="text-sm text-gray-600 print:text-gray-700 mt-0.5">👤 {currentTrack.organizers.join(", ")}</p>
              )}
            </div>
          </div>
        )}

        {/* Schedule by day */}
        {byDay.length === 0 && registeredActivities.length === 0 ? (
          <div className="mt-8 text-center py-10 print:hidden">
            <p className="text-gray-400 text-sm mb-2">No activities selected yet.</p>
            <button onClick={onEdit} className="text-purple-600 underline text-sm font-medium">
              Add some →
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-6 print:hidden">
            {byDay.map(([day, items]) => (
              <div key={day}>
                <h2
                  className="font-bold text-base mb-3 print:text-black"
                  style={{ color: "#7c3aed" }}
                >
                  {formatDay(day)}
                </h2>
                <div className="space-y-2">
                  {items.map((item) => {
                    if (item.kind === "standing") {
                      const ev = item.event;
                      return (
                        <div
                          key={`standing-${ev.id}`}
                          className="flex items-stretch rounded-xl bg-white print:bg-white border border-gray-200 print:border-gray-300 border-l-4 border-l-amber-500 overflow-hidden"
                        >
                          <div className="flex items-start gap-3 p-3 flex-1">
                            <div className="text-sm font-bold text-amber-700 print:text-gray-700 w-20 shrink-0 leading-snug">
                              {formatTime(ev.start_time)}
                              <br />
                              <span className="text-xs font-medium opacity-70">{formatTime(ev.end_time)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold uppercase tracking-wide text-amber-600 print:text-gray-500 mb-0.5">
                                Camp-wide
                              </p>
                              <p className="text-base font-semibold text-gray-900">
                                {ev.emoji ? `${ev.emoji} ` : ""}
                                {ev.name}
                              </p>
                              {ev.location && (
                                <p className="text-sm text-gray-600 print:text-gray-700 mt-0.5">📍 {ev.location}</p>
                              )}
                              {ev.organizers?.length > 0 && (
                                <p className="text-sm text-gray-600 print:text-gray-700 mt-0.5">👤 {ev.organizers.join(", ")}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    const a = item.activity;
                    const actSeries = a.series_id
                      ? series.find((s) => s.id === a.series_id)
                      : null;
                    return (
                      <div
                        key={a.id}
                        className="flex items-stretch rounded-xl bg-white print:bg-white border border-gray-200 print:border-gray-300 border-l-4 border-l-pink-500 overflow-hidden"
                      >
                        <div className="flex items-start gap-3 p-3 flex-1">
                          <div className="text-sm font-bold text-pink-600 print:text-gray-700 w-20 shrink-0 leading-snug">
                            {formatTime(a.start_time)}
                            <br />
                            <span className="text-xs font-medium opacity-70">{formatTime(a.end_time)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wide text-pink-600 print:text-gray-500 mb-0.5">
                              Activity
                            </p>
                            <p className="text-base font-semibold text-gray-900">
                              {a.emoji ? `${a.emoji} ` : ""}
                              {a.name}
                            </p>
                            {a.location && (
                              <p className="text-sm text-gray-600 print:text-gray-700 mt-0.5">📍 {a.location}</p>
                            )}
                            {a.organizers?.length > 0 && (
                              <p className="text-sm text-gray-600 print:text-gray-700 mt-0.5">👤 {a.organizers.join(", ")}</p>
                            )}
                            {actSeries && (
                              <p className="text-xs text-gray-500 mt-0.5">{actSeries.name}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Print-only table */}
        <div className="hidden print:block mt-4">
          {currentTrack && (
            <p className="text-xs text-gray-700 mb-3">
              <strong>Morning Track:</strong>{" "}
              {currentTrack.emoji ? `${currentTrack.emoji} ` : ""}
              {currentTrack.name} · {formatTime(currentTrack.start_time)}–{formatTime(currentTrack.end_time)}
              {currentTrack.location ? ` · ${currentTrack.location}` : ""}
              {currentTrack.organizers?.length > 0 ? ` · ${currentTrack.organizers.join(", ")}` : ""}
            </p>
          )}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-400">
                <th className="text-left py-1 pr-4 font-bold w-36">Time</th>
                <th className="text-left py-1 pr-4 font-bold">Event</th>
                <th className="text-left py-1 font-bold">Location</th>
              </tr>
            </thead>
            <tbody>
              {byDay.flatMap(([day, items]) => [
                <tr key={`hd-${day}`}>
                  <td colSpan={3} className="pt-3 pb-1 font-bold text-xs uppercase tracking-wide text-gray-600 border-b border-gray-300">
                    {formatDay(day)}
                  </td>
                </tr>,
                ...items.map((item) => {
                  if (item.kind === "standing") {
                    const ev = item.event;
                    return (
                      <tr key={`standing-${ev.id}`} className="border-b border-gray-200">
                        <td className="py-1 pr-4 text-gray-500 align-top whitespace-nowrap">
                          {formatTime(ev.start_time)}–{formatTime(ev.end_time)}
                        </td>
                        <td className="py-1 pr-4 align-top">
                          {ev.emoji ? `${ev.emoji} ` : ""}{ev.name}
                        </td>
                        <td className="py-1 text-gray-500 align-top">{ev.location || ""}</td>
                      </tr>
                    );
                  }
                  const a = item.activity;
                  return (
                    <tr key={a.id} className="border-b border-gray-200">
                      <td className="py-1 pr-4 text-gray-500 align-top whitespace-nowrap">
                        {formatTime(a.start_time)}–{formatTime(a.end_time)}
                      </td>
                      <td className="py-1 pr-4 align-top font-medium">
                        {a.emoji ? `${a.emoji} ` : ""}{a.name}
                      </td>
                      <td className="py-1 text-gray-500 align-top">{a.location || ""}</td>
                    </tr>
                  );
                }),
              ])}
            </tbody>
          </table>
        </div>

        {/* Actions — hidden on print */}
        <div className="mt-10 flex gap-3 print:hidden">
          <button
            onClick={onEdit}
            className="text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
            style={{ background: GRADIENT }}
          >
            Edit selections
          </button>
          <button
            onClick={() => window.print()}
            className="border-2 border-gray-300 px-6 py-2.5 rounded-full font-bold text-sm text-gray-700 hover:border-gray-400 transition-colors"
          >
            Print
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-400 print:hidden">
          This is your personal schedule link — bookmark it to come back anytime.
        </p>
      </div>

      {/* Rainbow bar — hidden on print */}
      <div className="h-2 print:hidden" style={{ background: `linear-gradient(to right, ${RAINBOW})` }} />
    </div>
  );
}

// ── Edit mode ─────────────────────────────────────────────────────────────────

function EditMode({
  token,
  camper,
  registeredActivityIds,
  activities,
  tracks,
  series,
  onCancel,
  onSaved,
}: Props & { onCancel: () => void; onSaved: () => void }) {
  const router = useRouter();

  const [userSelections, setUserSelections] = useState<Record<string, string>>(
    () => {
      const registeredIdSet = new Set(registeredActivityIds);
      const initial: Record<string, string> = {};
      for (const a of activities) {
        if (registeredIdSet.has(a.id)) {
          initial[`${a.day}|${a.start_time}|${a.end_time}`] = a.id;
        }
      }
      return initial;
    }
  );

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(camper.track_id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeSlots = useMemo(() => buildTimeSlots(activities), [activities]);

  const effectiveSelections = useMemo(() => {
    const result = { ...userSelections };
    for (const activityId of Object.values(userSelections)) {
      const picked = activities.find((a) => a.id === activityId);
      if (!picked?.series_id) continue;
      for (const partner of activities) {
        if (partner.series_id !== picked.series_id || partner.id === activityId) continue;
        const key = `${partner.day}|${partner.start_time}|${partner.end_time}`;
        if (!result[key]) result[key] = partner.id;
      }
    }
    return result;
  }, [userSelections, activities]);

  function handleSlotClick(slotKey: string, activity: ActivityWithSpots) {
    if (slotKey in effectiveSelections && !(slotKey in userSelections)) return;
    setUserSelections((prev) => {
      const next = { ...prev };
      if (prev[slotKey] === activity.id) {
        delete next[slotKey];
      } else {
        next[slotKey] = activity.id;
      }
      return next;
    });
  }

  function handleSeriesConfirm(slotKey: string, activity: ActivityWithSpots, companionSlotKeys: string[]) {
    setUserSelections((prev) => {
      const next = { ...prev };
      next[slotKey] = activity.id;
      for (const key of companionSlotKeys) delete next[key];
      return next;
    });
  }

  async function handleSave() {
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/update-registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        track_id: selectedTrackId,
        activity_ids: Object.values(effectiveSelections),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    onSaved();
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <div className="h-2" style={{ background: `linear-gradient(to right, ${RAINBOW})` }} />

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight"
            style={{ background: GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
          >
            Edit selections
          </h1>
          <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-800 underline">
            Cancel
          </button>
        </div>

        {/* Track selection */}
        {tracks.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border-t-4 p-6 space-y-3" style={{ borderTopColor: "#7c3aed" }}>
            <h2 className="text-lg font-bold" style={{ color: "#7c3aed" }}>Morning Track</h2>
            <div className="space-y-2">
              {tracks.map((track) => {
                const isFull = track.spots_left <= 0 && track.id !== camper.track_id;
                const isSelected = selectedTrackId === track.id;
                const isLow = track.spots_left > 0 && track.spots_left <= 3;
                return (
                  <label
                    key={track.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isFull
                        ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-200"
                        : isSelected
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-300 hover:border-purple-300 hover:bg-purple-50/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="track"
                      value={track.id}
                      checked={isSelected}
                      disabled={isFull}
                      onChange={() => setSelectedTrackId(track.id)}
                      className="mt-0.5 accent-purple-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {track.emoji ? `${track.emoji} ` : ""}{track.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(track.start_time)} – {formatTime(track.end_time)}
                      </p>
                      <p className="text-xs mt-0.5 font-semibold">
                        {isFull ? <span className="text-red-700">⛔ Full</span>
                          : isLow ? <span className="text-amber-700">⚠ {track.spots_left} spot{track.spots_left === 1 ? "" : "s"} left!</span>
                          : <span className="text-gray-400">{track.spots_left} spots left</span>}
                      </p>
                    </div>
                    {isSelected && <span className="text-purple-600 font-bold text-lg mt-0.5">✓</span>}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Activity selection */}
        <div className="bg-white rounded-2xl shadow-sm border-t-4 p-6 space-y-4" style={{ borderTopColor: "#4b96f3" }}>
          <h2 className="text-lg font-bold" style={{ color: "#4b96f3" }}>Activity Selection</h2>
          {timeSlots.length === 0 ? (
            <p className="text-sm text-gray-400">No activities have been added yet.</p>
          ) : (
            <ActivitySlots
              timeSlots={timeSlots}
              series={series}
              activities={activities}
              userSelections={userSelections}
              effectiveSelections={effectiveSelections}
              onSlotClick={handleSlotClick}
              onSeriesConfirm={handleSeriesConfirm}
            />
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={submitting}
            className="text-white px-6 py-3 rounded-full font-bold text-sm shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ background: GRADIENT }}
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={onCancel}
            className="border-2 border-gray-300 px-6 py-3 rounded-full font-bold text-sm text-gray-700 hover:border-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="h-2" style={{ background: `linear-gradient(to right, ${RAINBOW})` }} />
    </div>
  );
}
