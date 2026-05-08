"use client";

import { useMemo } from "react";
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

interface Props {
  timeSlots: TimeSlot[];
  series: ActivitySeries[];
  activities: ActivityWithSpots[];
  userSelections: Record<string, string>;
  effectiveSelections: Record<string, string>;
  onSlotClick: (slotKey: string, activity: ActivityWithSpots) => void;
}

export default function WorkshopSlots({
  timeSlots,
  series,
  activities,
  userSelections,
  effectiveSelections,
  onSlotClick,
}: Props) {
  const days = useMemo(() => {
    const map = new Map<string, TimeSlot[]>();
    for (const slot of timeSlots) {
      if (!map.has(slot.day)) map.set(slot.day, []);
      map.get(slot.day)!.push(slot);
    }
    return Array.from(map.entries());
  }, [timeSlots]);

  return (
    <div className="space-y-8">
      {days.map(([day, slots]) => (
        <div key={day}>
          <h3 className="font-semibold text-gray-800 mb-3">{formatDay(day)}</h3>
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
                <div key={slot.key} className="border rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                    {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                  </p>

                  {isLocked ? (
                    <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-md p-3">
                      <span className="text-indigo-500 text-sm mt-0.5">✓</span>
                      <div>
                        <p className="text-sm font-medium text-indigo-900">
                          {lockedActivity?.emoji
                            ? `${lockedActivity.emoji} `
                            : ""}
                          {lockedActivity?.name}
                        </p>
                        {lockedSeriesName && (
                          <p className="text-xs text-indigo-600 mt-0.5">
                            Included with &ldquo;{lockedSeriesName}&rdquo; —
                            deselect that workshop above to change
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
                            className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                              isFull
                                ? "opacity-50 cursor-not-allowed bg-gray-50"
                                : isSelected
                                  ? "border-black bg-gray-50 cursor-pointer"
                                  : "border-gray-200 hover:border-gray-400 cursor-pointer"
                            }`}
                          >
                            <input
                              type="radio"
                              name={slot.key}
                              value={activity.id}
                              checked={isSelected}
                              disabled={isFull}
                              readOnly
                              onClick={() =>
                                !isFull && onSlotClick(slot.key, activity)
                              }
                              className="mt-1 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">
                                  {activity.emoji ? `${activity.emoji} ` : ""}
                                  {activity.name}
                                </span>
                                {actSeries && (
                                  <span className="text-xs text-gray-400 italic">
                                    {actSeries.name}
                                  </span>
                                )}
                              </div>
                              {activity.description && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {activity.description}
                                </p>
                              )}
                              <p
                                className={`text-xs mt-1 font-medium ${
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
                                    ? `${activity.spots_left} spot${activity.spots_left === 1 ? "" : "s"} left!`
                                    : `${activity.spots_left} of ${activity.capacity} spots left`}
                              </p>
                            </div>
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
    </div>
  );
}
