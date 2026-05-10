"use client";

import { useEffect, useState } from "react";

type FilterType = "camp" | "track" | "activity" | "team";

type Camp = { id: string; name: string; is_active: boolean };
type Track = { id: string; name: string; emoji: string | null };
type Activity = { id: string; name: string; emoji: string | null; day: string };
type Recipient = { id: string; name: string; email: string };

type Me = { id: string; name: string | null; email: string; role: string };

export default function BroadcastPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [activeCamp, setActiveCamp] = useState<Camp | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState<FilterType>("camp");
  const [filterId, setFilterId] = useState<string>("");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [recipientsCampName, setRecipientsCampName] = useState<string>("");
  const [previewing, setPreviewing] = useState(false);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; failures: { email: string; error: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/me").then(r => r.ok ? r.json() : null).then(setMe);

    fetch("/api/admin/camps").then(r => r.ok ? r.json() : []).then((camps: Camp[]) => {
      const active = camps.find(c => c.is_active) ?? null;
      setActiveCamp(active);
      if (active) {
        Promise.all([
          fetch(`/api/admin/tracks?camp_id=${active.id}`).then(r => r.ok ? r.json() : []),
          fetch(`/api/admin/activities?camp_id=${active.id}`).then(r => r.ok ? r.json() : []),
        ]).then(([t, a]) => {
          setTracks(t);
          setActivities(a);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  function buildFilter() {
    if (filterType === "camp" || filterType === "team") return { type: filterType };
    return { type: filterType, id: filterId };
  }

  async function preview() {
    setError(null);
    setRecipients(null);
    if ((filterType === "track" || filterType === "activity") && !filterId) {
      setError(`Pick a ${filterType}.`);
      return;
    }
    setPreviewing(true);
    const res = await fetch("/api/admin/broadcast/recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filter: buildFilter() }),
    });
    if (res.ok) {
      const data = await res.json();
      setRecipients(data.recipients);
      setRecipientsCampName(data.campName);
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to load recipients.");
    }
    setPreviewing(false);
  }

  async function send() {
    if (!recipients || recipients.length === 0) return;
    if (!confirm(`Send "${subject}" to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}?`)) return;
    setSending(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, filter: buildFilter() }),
    });
    if (res.ok) {
      const data = await res.json();
      setResult(data);
      setSubject("");
      setBody("");
      setRecipients(null);
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to send.");
    }
    setSending(false);
  }

  function resetForm() {
    setResult(null);
    setError(null);
    setRecipients(null);
  }

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:bg-gray-800 dark:text-gray-100";

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;

  if (me && me.role !== "admin") {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-3">Broadcast</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Only admins can send broadcasts. Staff have read-only access.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Broadcast Message</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Send an email to a group of campers or your team. Each recipient gets a personalized greeting.
      </p>

      {result && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-200/20">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            ✓ Sent to {result.sent} recipient{result.sent === 1 ? "" : "s"}.
            {result.failed > 0 && <> {result.failed} failed.</>}
          </p>
          {result.failures.length > 0 && (
            <ul className="mt-2 text-xs text-green-700 dark:text-green-400 space-y-0.5">
              {result.failures.map((f, i) => (
                <li key={i}>• {f.email}: {f.error}</li>
              ))}
            </ul>
          )}
          <button onClick={resetForm} className="mt-3 text-sm text-green-700 dark:text-green-400 underline">Send another</button>
        </div>
      )}

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded px-4 py-3">{error}</p>
      )}

      {!result && (
        <div className="space-y-4 p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Send to</label>
            <div className="space-y-2">
              <select
                value={filterType}
                onChange={e => { setFilterType(e.target.value as FilterType); setFilterId(""); setRecipients(null); }}
                className={inputCls}
              >
                <option value="camp">All campers in active camp{activeCamp ? ` (${activeCamp.name})` : ""}</option>
                <option value="track" disabled={!activeCamp || tracks.length === 0}>Specific track…</option>
                <option value="activity" disabled={!activeCamp || activities.length === 0}>Specific activity…</option>
                <option value="team">All admins + staff</option>
              </select>

              {filterType === "track" && (
                <select value={filterId} onChange={e => { setFilterId(e.target.value); setRecipients(null); }} className={inputCls}>
                  <option value="">Pick a track…</option>
                  {tracks.map(t => (
                    <option key={t.id} value={t.id}>{t.emoji ? `${t.emoji} ` : ""}{t.name}</option>
                  ))}
                </select>
              )}

              {filterType === "activity" && (
                <select value={filterId} onChange={e => { setFilterId(e.target.value); setRecipients(null); }} className={inputCls}>
                  <option value="">Pick an activity…</option>
                  {activities.map(a => (
                    <option key={a.id} value={a.id}>{a.emoji ? `${a.emoji} ` : ""}{a.name} · {a.day.split(",").map(d => d.trim().slice(0, 3)).join("/")}</option>
                  ))}
                </select>
              )}

              {(filterType === "camp" || filterType === "track" || filterType === "activity") && !activeCamp && (
                <p className="text-xs text-amber-600 dark:text-amber-400">No active camp set. Activate a camp first or send to the team.</p>
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} placeholder="Reminder: bring sunscreen tomorrow" />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              className={inputCls + " resize-y"}
              placeholder="Write your message here. Each recipient will see &quot;Hi {their name},&quot; before this text."
            />
            <p className="text-xs text-gray-400 mt-1">Plain text. Blank lines = paragraph breaks.</p>
          </div>

          {/* Preview button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={preview}
              disabled={previewing || !subject.trim() || !body.trim() || ((filterType === "track" || filterType === "activity") && !filterId)}
              className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {previewing ? "Loading…" : "Preview recipients"}
            </button>
          </div>

          {/* Recipient list (after preview) */}
          {recipients && (
            <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium mb-2 text-gray-900 dark:text-white">
                {recipients.length} recipient{recipients.length === 1 ? "" : "s"}
                {recipientsCampName && <span className="text-gray-500 dark:text-gray-400 font-normal"> · {recipientsCampName}</span>}
              </p>
              {recipients.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No one matches this filter.</p>
              ) : (
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 max-h-40 overflow-y-auto">
                  {recipients.map(r => (
                    <li key={r.id}>{r.name} <span className="opacity-60">&lt;{r.email}&gt;</span></li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={send}
                  disabled={sending || recipients.length === 0}
                  className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {sending ? "Sending…" : `Send to ${recipients.length}`}
                </button>
                <button onClick={() => setRecipients(null)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
