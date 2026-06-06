import type { Track, Activity, StandingEvent } from "@/types/database";

function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function parseDays(day: string): string[] {
  return day ? day.split(",").map((d) => d.trim()).filter(Boolean) : [];
}

// Returns standing events whose time window overlaps [startTime, endTime] on any of the given days.
// Pass `null` for `days` to mean "every day" (used for tracks).
export type OrganizerConflict = {
  organizer: string;
  eventName: string;
  eventDays: string | null; // null = every day (track)
  eventStart: string;
  eventEnd: string;
};

function daysOverlap(a: string[] | null, b: string[] | null): boolean {
  if (a === null || b === null) return true;
  const setA = new Set(a);
  return b.some((d) => setA.has(d));
}

export function findOrganizerConflicts(
  organizers: string[],
  startTime: string,
  endTime: string,
  days: string[] | null,
  excludeId: string | undefined,
  excludeType: "track" | "activity" | "standing",
  tracks: Track[],
  activities: Activity[],
  standingEvents: StandingEvent[],
): OrganizerConflict[] {
  if (!organizers.length || !startTime || !endTime) return [];
  const start = timeToMins(startTime);
  const end = timeToMins(endTime);
  if (end <= start) return [];
  const orgSet = new Set(organizers);
  const conflicts: OrganizerConflict[] = [];

  function check(
    id: string,
    type: "track" | "activity" | "standing",
    name: string,
    evOrgs: string[],
    evStart: string,
    evEnd: string,
    evDays: string[] | null,
  ) {
    if (id === excludeId && type === excludeType) return;
    const s = timeToMins(evStart);
    const e = timeToMins(evEnd);
    if (e <= s) return;
    if (s >= end || e <= start) return;
    if (!daysOverlap(days, evDays)) return;
    for (const org of evOrgs) {
      if (orgSet.has(org)) {
        conflicts.push({ organizer: org, eventName: name, eventDays: evDays ? evDays.join(", ") : null, eventStart: evStart, eventEnd: evEnd });
        break;
      }
    }
  }

  for (const t of tracks ?? []) check(t.id, "track", t.name, t.organizers ?? [], t.start_time, t.end_time, null);
  for (const a of activities ?? []) check(a.id, "activity", a.name, a.organizers ?? [], a.start_time, a.end_time, parseDays(a.day));
  for (const ev of standingEvents ?? []) check(ev.id, "standing", ev.name, ev.organizers ?? [], ev.start_time, ev.end_time, parseDays(ev.day));

  return conflicts;
}

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

  return (standingEvents ?? []).filter((ev) => {
    if (checkDays !== null) {
      const evDays = parseDays(ev.day);
      if (!evDays.some((d) => checkDays.has(d))) return false;
    }
    const evStart = timeToMins(ev.start_time);
    const evEnd = timeToMins(ev.end_time);
    return evStart < end && evEnd > start;
  });
}
