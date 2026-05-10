"use client";

import { formatTime } from "@/lib/format";

type Camper = {
  chosen_first_name: string;
  chosen_last_name: string;
  pronouns: string | null;
};

interface RosterPrintProps {
  campName: string;
  kindLabel: "Track" | "Activity";
  itemName: string;
  emoji: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  days: string[];
  campers: Camper[];
}

export function RosterPrint({
  campName,
  kindLabel,
  itemName,
  emoji,
  startTime,
  endTime,
  location,
  days,
  campers,
}: RosterPrintProps) {
  const sorted = [...campers].sort((a, b) => {
    const an = `${a.chosen_first_name} ${a.chosen_last_name}`.toLowerCase();
    const bn = `${b.chosen_first_name} ${b.chosen_last_name}`.toLowerCase();
    return an.localeCompare(bn);
  });

  return (
    <div className="bg-white text-black min-h-screen">
      <div className="max-w-4xl mx-auto p-8 print:p-0">
        {/* On-screen toolbar */}
        <div className="print:hidden mb-6 flex items-center justify-between">
          <a href="javascript:history.back()" className="text-sm text-gray-600 hover:text-gray-900 underline">
            ← Back
          </a>
          <button
            onClick={() => window.print()}
            className="bg-black text-white px-5 py-2 rounded text-sm font-medium hover:bg-gray-800"
            type="button"
          >
            Print
          </button>
        </div>

        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <p className="text-sm uppercase tracking-wide text-gray-600">{campName} · {kindLabel}</p>
          <h1 className="text-3xl font-bold mt-1">
            {emoji ? `${emoji} ` : ""}{itemName}
          </h1>
          <div className="mt-2 text-sm space-y-0.5">
            <p><span className="font-semibold">Time:</span> {formatTime(startTime)} – {formatTime(endTime)}</p>
            <p><span className="font-semibold">Days:</span> {days.length > 0 ? days.join(", ") : "—"}</p>
            {location && <p><span className="font-semibold">Location:</span> {location}</p>}
            <p><span className="font-semibold">Roster:</span> {sorted.length} camper{sorted.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        {/* Roster table */}
        {sorted.length === 0 ? (
          <p className="text-gray-500 italic">No campers enrolled.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2 px-2 w-8 font-semibold">#</th>
                <th className="text-left py-2 px-2 font-semibold">Name</th>
                <th className="text-left py-2 px-2 font-semibold w-32">Pronouns</th>
                {days.map((d) => (
                  <th key={d} className="text-center py-2 px-2 font-semibold w-14">
                    {d.slice(0, 3)}
                  </th>
                ))}
                <th className="text-left py-2 px-2 font-semibold w-40">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => (
                <tr key={i} className="border-b border-gray-300">
                  <td className="py-3 px-2 text-gray-500">{i + 1}</td>
                  <td className="py-3 px-2 font-medium">
                    {c.chosen_first_name} {c.chosen_last_name}
                  </td>
                  <td className="py-3 px-2 text-gray-600">{c.pronouns ?? ""}</td>
                  {days.map((d) => (
                    <td key={d} className="py-3 px-2 text-center">
                      <span className="inline-block w-5 h-5 border border-black" />
                    </td>
                  ))}
                  <td className="py-3 px-2"></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <p className="mt-8 text-xs text-gray-400 print:text-gray-600">
          Printed {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>
    </div>
  );
}
