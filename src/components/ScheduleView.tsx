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
  legal_first_name: string;
  chosen_name: string | null;
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

// ── Root ──────────────────────────────────────────────────────────────────────

export default function ScheduleView(props: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <EditMode {...props} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
    );
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
  const displayName = camper.chosen_name || camper.legal_first_name;
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

  // Group registered activities by day
  const byDay = useMemo(() => {
    const map = new Map<string, ActivityWithSpots[]>();
    for (const a of registeredActivities) {
      if (!map.has(a.day)) map.set(a.day, []);
      map.get(a.day)!.push(a);
    }
    return Array.from(map.entries());
  }, [registeredActivities]);

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <p className="text-sm text-gray-500 mb-1">{campName}</p>
      <h1 className="text-2xl font-bold">
        {displayName}&apos;s Schedule
      </h1>
      {camper.pronouns && (
        <p className="text-gray-500 text-sm mt-0.5">{camper.pronouns}</p>
      )}

      {/* Track */}
      {currentTrack && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Morning Track
          </p>
          <p className="font-medium">
            {currentTrack.emoji ? `${currentTrack.emoji} ` : ""}
            {currentTrack.name}
          </p>
          <p className="text-sm text-gray-500">
            {formatTime(currentTrack.start_time)} –{" "}
            {formatTime(currentTrack.end_time)}
          </p>
        </div>
      )}

      {/* Schedule by day */}
      {byDay.length === 0 ? (
        <p className="text-gray-400 text-sm mt-8">
          No workshops selected yet.{" "}
          <button onClick={onEdit} className="underline">
            Add some →
          </button>
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          {byDay.map(([day, dayActivities]) => (
            <div key={day}>
              <h2 className="font-semibold text-gray-900 mb-3">
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
                      className="flex items-start gap-3 p-3 rounded-lg border"
                    >
                      <div className="text-xs text-gray-400 w-24 pt-0.5 shrink-0">
                        {formatTime(a.start_time)}
                        <br />
                        {formatTime(a.end_time)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {a.emoji ? `${a.emoji} ` : ""}
                          {a.name}
                        </p>
                        {actSeries && (
                          <p className="text-xs text-gray-400 italic">
                            {actSeries.name}
                          </p>
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

      {/* Actions */}
      <div className="mt-10 flex gap-3 print:hidden">
        <button
          onClick={onEdit}
          className="bg-black text-white px-5 py-2.5 rounded font-medium text-sm hover:bg-gray-800 transition-colors"
        >
          Edit selections
        </button>
        <button
          onClick={() => window.print()}
          className="border border-gray-300 px-5 py-2.5 rounded font-medium text-sm hover:border-gray-500 transition-colors"
        >
          Print
        </button>
      </div>

      <p className="mt-8 text-xs text-gray-400 print:hidden">
        This is your personal schedule link — bookmark it to come back anytime.
      </p>
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

  // Initialize from current registrations — treat each as an explicit selection
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

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(
    camper.track_id
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeSlots = useMemo(() => buildTimeSlots(activities), [activities]);

  const effectiveSelections = useMemo(() => {
    const result = { ...userSelections };
    for (const activityId of Object.values(userSelections)) {
      const picked = activities.find((a) => a.id === activityId);
      if (!picked?.series_id) continue;
      for (const partner of activities) {
        if (
          partner.series_id !== picked.series_id ||
          partner.id === activityId
        )
          continue;
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
    router.refresh(); // re-run server component to get fresh registration data
  }

  return (
    <div className="max-w-xl mx-auto py-12 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit selections</h1>
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>

      {/* Track selection */}
      {tracks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold border-b pb-2">Morning Track</h2>
          <div className="space-y-2">
            {tracks.map((track) => {
              const isFull =
                track.spots_left <= 0 && track.id !== camper.track_id;
              const isSelected = selectedTrackId === track.id;
              const isLow = track.spots_left > 0 && track.spots_left <= 3;
              return (
                <label
                  key={track.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isFull
                      ? "opacity-50 cursor-not-allowed bg-gray-50"
                      : isSelected
                        ? "border-black bg-gray-50"
                        : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="track"
                    value={track.id}
                    checked={isSelected}
                    disabled={isFull}
                    onChange={() => setSelectedTrackId(track.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {track.emoji ? `${track.emoji} ` : ""}
                      {track.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTime(track.start_time)} –{" "}
                      {formatTime(track.end_time)}
                    </p>
                    <p
                      className={`text-xs mt-0.5 font-medium ${
                        isFull
                          ? "text-red-500"
                          : isLow
                            ? "text-amber-600"
                            : "text-gray-400"
                      }`}
                    >
                      {isFull
                        ? "Full"
                        : isLow
                          ? `${track.spots_left} spot${track.spots_left === 1 ? "" : "s"} left!`
                          : `${track.spots_left} spots left`}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* Workshop selection */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          Workshop Selection
        </h2>
        {timeSlots.length === 0 ? (
          <p className="text-sm text-gray-400">
            No workshops have been added yet.
          </p>
        ) : (
          <WorkshopSlots
            timeSlots={timeSlots}
            series={series}
            activities={activities}
            userSelections={userSelections}
            effectiveSelections={effectiveSelections}
            onSlotClick={handleSlotClick}
          />
        )}
      </section>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={submitting}
          className="bg-black text-white px-6 py-2.5 rounded font-semibold text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={onCancel}
          className="border border-gray-300 px-6 py-2.5 rounded font-medium text-sm hover:border-gray-500 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
