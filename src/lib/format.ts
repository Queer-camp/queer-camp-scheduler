export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function formatDateRange(start: string, end: string): string {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const s = new Date(sy, sm - 1, sd);
  const e = new Date(ey, em - 1, ed);
  const month = s.toLocaleDateString("en-US", { month: "long" });
  const endMonth = e.toLocaleDateString("en-US", { month: "long" });
  if (sm === em && sy === ey) {
    return `${month} ${sd}–${ed}, ${sy}`;
  }
  if (sy === ey) {
    return `${month} ${sd} – ${endMonth} ${ed}, ${sy}`;
  }
  return `${month} ${sd}, ${sy} – ${endMonth} ${ed}, ${ey}`;
}

export function formatDay(day: string): string {
  // Comma-separated day names ("Saturday,Wednesday") → "Saturday & Wednesday"
  if (day.includes(",")) {
    return day.split(",").map(d => d.trim()).join(" & ");
  }
  // Plain day name ("Monday") — pass through
  if (!day.includes("-")) return day;
  // ISO date ("2026-03-15")
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
