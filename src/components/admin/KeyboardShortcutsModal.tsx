"use client";

import { useEffect } from "react";

const GROUPS = [
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["g", "c"], description: "Go to Camps" },
      { keys: ["g", "p"], description: "Go to Campers" },
    ],
  },
  {
    label: "Camps",
    shortcuts: [
      { keys: ["N"], description: "New camp" },
    ],
  },
  {
    label: "Camp detail",
    shortcuts: [
      { keys: ["1"], description: "Tracks tab" },
      { keys: ["2"], description: "Activities tab" },
      { keys: ["3"], description: "Series tab" },
    ],
  },
  {
    label: "Campers",
    shortcuts: [
      { keys: ["/"], description: "Focus search" },
      { keys: ["S"], description: "Toggle select mode" },
      { keys: ["A"], description: "Select / deselect all (in select mode)" },
    ],
  },
  {
    label: "General",
    shortcuts: [
      { keys: ["?"], description: "Show / hide this legend" },
      { keys: ["Esc"], description: "Close / cancel" },
    ],
  },
];

function Key({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-400 leading-none">
      {label}
    </kbd>
  );
}

export function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "?") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Keyboard shortcuts</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg leading-none">✕</button>
        </div>

        <div className="space-y-5">
          {GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">{group.label}</p>
              <div className="space-y-2">
                {group.shortcuts.map(s => (
                  <div key={s.description} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{s.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-xs text-gray-400 dark:text-gray-500">then</span>}
                          <Key label={k} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-5 text-center">Press <Key label="?" /> or <Key label="Esc" /> to close</p>
      </div>
    </div>
  );
}
