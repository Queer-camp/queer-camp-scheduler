import type { StandingEvent } from "@/types/database";
import { formatTime } from "@/lib/format";

export function ConflictWarning({ conflicts }: { conflicts: StandingEvent[] }) {
  if (conflicts.length === 0) return null;
  return (
    <div className="text-xs px-2.5 py-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200">
      <p className="font-medium mb-0.5">⚠️ Overlaps standing event{conflicts.length > 1 ? "s" : ""}</p>
      <ul className="space-y-0.5">
        {conflicts.map((ev) => (
          <li key={ev.id} className="opacity-90">
            {ev.emoji ? `${ev.emoji} ` : ""}
            <span className="font-medium">{ev.name}</span>{" "}
            <span className="opacity-75">
              ({formatTime(ev.start_time)} – {formatTime(ev.end_time)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
