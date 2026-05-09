"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  ActivityWithSpots,
  TrackWithSpots,
  ActivitySeries,
} from "@/types/database";
import WorkshopSlots, { buildTimeSlots } from "@/components/WorkshopSlots";
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

function ViewMode({
  camper,
  campName,
  registeredActivityIds,
  activities,
  tracks,
  series,
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
    const map = new Map<string, ActivityWithSpots[]>();
    for (const a of registeredActivities) {
      if (!map.has(a.day)) map.set(a.day, []);
      map.get(a.day)!.push(a);
    }
    return Array.from(map.entries());
  }, [registeredActivities]);

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
        <h1 className="text-3xl font-extrabold tracking-tight print:text-black mb-0.5"
          style={{ background: GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
        >
          {displayName}&apos;s Schedule
        </h1>
        {camper.pronouns && (
          <p className="text-gray-500 print:text-gray-600 text-sm mt-0.5">{camper.pronouns}</p>
        )}

        {/* Track */}
        {currentTrack && (
          <div className="mt-6 p-4 bg-white print:bg-white rounded-xl border-2 border-purple-200 print:border print:border-gray-300">
            <p className="text-xs font-bold text-purple-500 print:text-gray-500 uppercase tracking-wide mb-1">
              Morning Track
            </p>
            <p className="font-semibold text-gray-900">
              {currentTrack.emoji ? `${currentTrack.emoji} ` : ""}
              {currentTrack.name}
            </p>
            <p className="text-sm text-gray-500 print:text-gray-600">
              {formatTime(currentTrack.start_time)} – {formatTime(currentTrack.end_time)}
            </p>
          </div>
        )}

        {/* Schedule by day */}
        {byDay.length === 0 ? (
          <div className="mt-8 text-center py-10 print:hidden">
            <p className="text-gray-400 text-sm mb-2">No workshops selected yet.</p>
            <button onClick={onEdit} className="text-purple-600 underline text-sm font-medium">
              Add some →
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {byDay.map(([day, dayActivities]) => (
              <div key={day}>
                <h2
                  className="font-bold text-base mb-3 print:text-black"
                  style={{ color: "#7c3aed" }}
                >
                  {formatDay(day)}
                </h2>
                <div className="space-y-2">
                  {dayActivities.map((a) => {
                    const actSeries = a.series_id
                      ? series.find((s) => s.id === a.series_id)
                      : null;
                    return (
                      <div
                        key={a.id}
                        className="flex items-start gap-3 p-3 rounded-xl bg-white print:bg-white border border-gray-200 print:border-gray-300"
                      >
                        <div className="text-xs text-gray-400 print:text-gray-600 w-20 pt-0.5 shrink-0 font-medium">
                          {formatTime(a.start_time)}
                          <br />
                          {formatTime(a.end_time)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {a.emoji ? `${a.emoji} ` : ""}
                            {a.name}
                          </p>
                          {actSeries && (
                            <p className="text-xs text-gray-500 mt-0.5">{actSeries.name}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

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

        {/* Workshop selection */}
        <div className="bg-white rounded-2xl shadow-sm border-t-4 p-6 space-y-4" style={{ borderTopColor: "#4b96f3" }}>
          <h2 className="text-lg font-bold" style={{ color: "#4b96f3" }}>Workshop Selection</h2>
          {timeSlots.length === 0 ? (
            <p className="text-sm text-gray-400">No workshops have been added yet.</p>
          ) : (
            <WorkshopSlots
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
