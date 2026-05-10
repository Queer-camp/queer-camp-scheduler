import type { StandingEvent } from "@/types/database";

function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function parseDays(day: string): string[] {
  return day ? day.split(",").map((d) => d.trim()).filter(Boolean) : [];
}

// Returns standing events whose time window overlaps [startTime, endTime] on any of the given days.
// Pass `null` for `days` to mean "every day" (used for tracks).
export function findStandingEventConflicts(
  startTime: string,
  endTime: string,
  days: string[] | null,
  standingEvents: StandingEvent[],
): StandingEvent[] {
  if (!startTime || !endTime) return [];
  const start = timeToMins(startTime);
  const end = timeToMins(endTime);
  if (end <= start) return [];

  const checkDays = days === null ? null : new Set(days);

  return standingEvents.filter((ev) => {
    if (checkDays !== null) {
      const evDays = parseDays(ev.day);
      if (!evDays.some((d) => checkDays.has(d))) return false;
    }
    const evStart = timeToMins(ev.start_time);
    const evEnd = timeToMins(ev.end_time);
    return evStart < end && evEnd > start;
  });
}
