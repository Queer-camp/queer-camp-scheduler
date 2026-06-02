"use client";

import { useMemo, useState } from "react";
import type { ActivityWithSpots, ActivitySeries } from "@/types/database";
import { formatTime, formatDay } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TimeSlot {
  key: string;
  day: string;
  startTime: string;
  endTime: string;
  activities: ActivityWithSpots[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function buildTimeSlots(activities: ActivityWithSpots[]): TimeSlot[] {
  const map = new Map<string, TimeSlot>();
  for (const a of activities) {
    const key = `${a.day}|${a.start_time}|${a.end_time}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        day: a.day,
        startTime: a.start_time,
        endTime: a.end_time,
        activities: [],
      });
    }
    map.get(key)!.activities.push(a);
  }
  return Array.from(map.values());
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SeriesPending {
  slotKey: string;
  activity: ActivityWithSpots;
  seriesName: string;
  companions: ActivityWithSpots[];
}

interface Props {
  timeSlots: TimeSlot[];
  series: ActivitySeries[];
  activities: ActivityWithSpots[];
  userSelections: Record<string, string>;
  effectiveSelections: Record<string, string>;
  onSlotClick: (slotKey: string, activity: ActivityWithSpots) => void;
  onSeriesConfirm?: (slotKey: string, activity: ActivityWithSpots, companionSlotKeys: string[]) => void;
}

export default function ActivitySlots({
  timeSlots,
  series,
  activities,
  userSelections,
  effectiveSelections,
  onSlotClick,
  onSeriesConfirm,
}: Props) {
  const [seriesPending, setSeriesPending] = useState<SeriesPending | null>(null);
  const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const days = useMemo(() => {
    const map = new Map<string, TimeSlot[]>();
    for (const slot of timeSlots) {
      if (!map.has(slot.day)) map.set(slot.day, []);
      map.get(slot.day)!.push(slot);
    }
    return Array.from(map.entries()).sort(([a], [b]) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  }, [timeSlots]);

  function confirmSeries() {
    if (!seriesPending) return;
    const { slotKey, activity, companions } = seriesPending;
    const companionSlotKeys = companions.map((c) => `${c.day}|${c.start_time}|${c.end_time}`);
    if (onSeriesConfirm) {
      onSeriesConfirm(slotKey, activity, companionSlotKeys);
    } else {
      onSlotClick(slotKey, activity);
    }
    setSeriesPending(null);
  }

  return (
    <div className="space-y-8">
      {days.map(([day, slots]) => (
        <div key={day}>
          <h3 className="font-bold text-gray-900 text-base mb-3">{formatDay(day)}</h3>
          <div className="space-y-3">
            {slots.map((slot) => {
              const isLocked =
                slot.key in effectiveSelections &&
                !(slot.key in userSelections);
              const lockedActivity = isLocked
                ? activities.find((a) => a.id === effectiveSelections[slot.key])
                : null;
              const lockedSeriesName = lockedActivity?.series_id
                ? series.find((s) => s.id === lockedActivity.series_id)?.name
                : null;

              return (
                <div key={slot.key} className="border-2 border-gray-200 rounded-xl p-4 bg-white">
                  <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">
                    {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                  </p>

                  {isLocked ? (
                    <div className="flex items-start gap-2 bg-indigo-50 border-2 border-indigo-200 rounded-lg p-3">
                      <span className="text-indigo-600 font-bold text-sm mt-0.5">✓</span>
                      <div>
                        <p className="text-sm font-semibold text-indigo-900">
                          {lockedActivity?.emoji
                            ? `${lockedActivity.emoji} `
                            : ""}
                          {lockedActivity?.name}
                        </p>
                        {lockedSeriesName && (
                          <p className="text-xs text-indigo-700 mt-0.5">
                            Included with &ldquo;{lockedSeriesName}&rdquo; —
                            deselect that activity above to change
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {slot.activities.map((activity) => {
                        const isFull = activity.spots_left <= 0;
                        const isSelected =
                          userSelections[slot.key] === activity.id;
                        const isLow =
                          activity.spots_left > 0 && activity.spots_left <= 3;
                        const actSeries = activity.series_id
                          ? series.find((s) => s.id === activity.series_id)
                          : null;

                        return (
                          <label
                            key={activity.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors ${
                              isFull
                                ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-200"
                                : isSelected
                                  ? "border-purple-500 bg-purple-50 cursor-pointer"
                                  : "border-gray-300 bg-white hover:border-purple-300 hover:bg-purple-50/30 cursor-pointer"
                            }`}
                          >
                            <input
                              type="radio"
                              name={slot.key}
                              value={activity.id}
                              checked={isSelected}
                              disabled={isFull}
                              readOnly
                              onClick={() => {
                                if (isFull) return;
                                // Intercept series selections (not deselections)
                                if (activity.series_id && !isSelected && actSeries) {
                                  const companions = activities.filter(
                                    (a) => a.series_id === activity.series_id && a.id !== activity.id
                                  );
                                  setSeriesPending({ slotKey: slot.key, activity, seriesName: actSeries.name, companions });
                                } else {
                                  onSlotClick(slot.key, activity);
                                }
                              }}
                              className="mt-1 cursor-pointer accent-purple-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-900">
                                  {activity.emoji ? `${activity.emoji} ` : ""}
                                  {activity.name}
                                </span>
                                {actSeries && (
                                  <span className="text-xs text-gray-600 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                                    {actSeries.name}
                                  </span>
                                )}
                              </div>
                              {activity.description && (
                                <p className="text-xs text-gray-700 mt-0.5">
                                  {activity.description}
                                </p>
                              )}
                              {(activity.location || activity.organizers?.length > 0) && (
                                <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2">
                                  {activity.location && <span>📍 {activity.location}</span>}
                                  {activity.organizers?.length > 0 && <span>👤 {activity.organizers.join(", ")}</span>}
                                </p>
                              )}
                              <p className="text-xs mt-1 font-semibold">
                                {isFull ? (
                                  <span className="text-red-700">⛔ Full</span>
                                ) : isLow ? (
                                  <span className="text-amber-700">⚠ Only {activity.spots_left} spot{activity.spots_left === 1 ? "" : "s"} left!</span>
                                ) : (
                                  <span className="text-gray-500">{activity.spots_left} spots left</span>
                                )}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="text-purple-600 font-bold text-lg mt-0.5" aria-label="Selected">✓</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {seriesPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">This is a series</h2>
              <p className="text-sm text-gray-600 mt-1">
                <strong>{seriesPending.activity.name}</strong> is part of the &ldquo;{seriesPending.seriesName}&rdquo; series.
                Signing up includes all sessions:
              </p>
            </div>
            <ul className="space-y-1.5">
              {[seriesPending.activity, ...seriesPending.companions].map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-sm text-gray-800">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span>
                    <span className="font-semibold">{a.emoji ? `${a.emoji} ` : ""}{a.name}</span>
                    <span className="text-gray-500"> — {formatDay(a.day)}, {formatTime(a.start_time)}–{formatTime(a.end_time)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-gray-500">Do you want to sign up for the whole series?</p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={confirmSeries}
                className="flex-1 text-white py-2.5 px-4 rounded-full font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(to right, #e879a8, #7c3aed)" }}
              >
                Sign up for the series
              </button>
              <button
                onClick={() => setSeriesPending(null)}
                className="flex-1 py-2.5 px-4 rounded-full font-semibold text-sm border-2 border-gray-300 text-gray-700 hover:border-gray-400 transition-colors"
              >
                Pick another activity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
