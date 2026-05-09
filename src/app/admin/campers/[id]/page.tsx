"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatTime, formatDay } from "@/lib/format";

type Activity = {
  id: string;
  name: string;
  day: string;
  start_time: string;
  end_time: string;
  emoji: string | null;
};

type Registration = {
  id: string;
  activities: Activity;
};

type Track = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
};

type Camper = {
  id: string;
  chosen_first_name: string;
  chosen_last_name: string;
  legal_first_name: string;
  legal_last_name: string;
  pronouns: string | null;
  email: string;
  track_id: string | null;
  camp_id: string;
  created_at: string;
  tracks: Track | null;
  registrations: Registration[];
};

type CampActivity = {
  id: string;
  name: string;
  day: string;
  start_time: string;
  end_time: string;
  emoji: string | null;
};

export default function CamperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [camper, setCamper] = useState<Camper | null>(null);
  const [allActivities, setAllActivities] = useState<CampActivity[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [addingActivity, setAddingActivity] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingTrack, setEditingTrack] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [savingTrack, setSavingTrack] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/campers/${id}`);
    if (res.ok) {
      const data: Camper = await res.json();
      setCamper(data);
      setSelectedTrackId(data.track_id ?? "");
      const [actRes, trackRes] = await Promise.all([
        fetch(`/api/admin/activities?camp_id=${data.camp_id}`),
        fetch(`/api/admin/tracks?camp_id=${data.camp_id}`),
      ]);
      if (actRes.ok) setAllActivities(await actRes.json());
      if (trackRes.ok) setAllTracks(await trackRes.json());
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function resendLink() {
    setResending(true);
    await fetch(`/api/admin/campers/${id}/resend-link`, { method: "POST" });
    setResending(false);
    setResendDone(true);
    setTimeout(() => setResendDone(false), 3000);
  }

  async function saveTrack() {
    setSavingTrack(true);
    await fetch(`/api/admin/campers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_id: selectedTrackId || null }),
    });
    setSavingTrack(false);
    setEditingTrack(false);
    await load();
  }

  async function removeRegistration(activityId: string) {
    await fetch(`/api/admin/campers/${id}/registrations/${activityId}`, { method: "DELETE" });
    await load();
  }

  async function addRegistration() {
    if (!selectedActivityId) return;
    setSaving(true);
    await fetch(`/api/admin/campers/${id}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activity_id: selectedActivityId }),
    });
    setAddingActivity(false);
    setSelectedActivityId("");
    setSaving(false);
    await load();
  }

  if (loading) return <p className="text-gray-500 text-sm">Loading…</p>;
  if (!camper) return <p className="text-red-600 text-sm">Camper not found.</p>;

  const registeredIds = new Set(camper.registrations.map(r => r.activities.id));
  const unregisteredActivities = allActivities.filter(a => !registeredIds.has(a.id));

  const byDay: Record<string, Activity[]> = {};
  for (const reg of camper.registrations) {
    const act = reg.activities;
    const days = act.day.split(",").map(d => d.trim());
    for (const day of days) {
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(act);
    }
  }
  const sortedDays = Object.keys(byDay).sort();

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/campers" className="text-sm text-gray-500 hover:text-gray-900">
          ← Campers
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            {camper.chosen_first_name} {camper.chosen_last_name}
            {camper.pronouns && <span className="text-base font-normal text-gray-400 ml-2">({camper.pronouns})</span>}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{camper.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Legal name: {camper.legal_first_name} {camper.legal_last_name}
          </p>
        </div>
        <button
          onClick={resendLink}
          disabled={resending}
          className="text-sm bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50 shrink-0"
        >
          {resendDone ? "Sent!" : resending ? "Sending…" : "Resend schedule link"}
        </button>
      </div>

      {/* Track */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Track</h2>
          {!editingTrack && (
            <button onClick={() => setEditingTrack(true)} className="text-sm text-gray-600 hover:text-gray-900 underline">
              {camper.tracks ? "Change" : "Assign"}
            </button>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          {editingTrack ? (
            <div className="flex items-center gap-3">
              <select
                value={selectedTrackId}
                onChange={e => setSelectedTrackId(e.target.value)}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">No track</option>
                {allTracks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({formatTime(t.start_time)} – {formatTime(t.end_time)})
                  </option>
                ))}
              </select>
              <button
                onClick={saveTrack}
                disabled={savingTrack}
                className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {savingTrack ? "Saving…" : "Save"}
              </button>
              <button onClick={() => { setEditingTrack(false); setSelectedTrackId(camper.track_id ?? ""); }} className="text-sm text-gray-500 hover:text-gray-900 underline">
                Cancel
              </button>
            </div>
          ) : camper.tracks ? (
            <p className="font-medium">{camper.tracks.name}
              <span className="text-sm font-normal text-gray-500 ml-2">
                {formatTime(camper.tracks.start_time)} – {formatTime(camper.tracks.end_time)}
              </span>
            </p>
          ) : (
            <p className="text-gray-400 text-sm">No track assigned</p>
          )}
        </div>
      </section>

      {/* Activities */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Activities</h2>
          <button
            onClick={() => setAddingActivity(!addingActivity)}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            {addingActivity ? "Cancel" : "Add activity"}
          </button>
        </div>

        {addingActivity && (
          <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg flex items-center gap-3">
            <select
              value={selectedActivityId}
              onChange={e => setSelectedActivityId(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Select an activity…</option>
              {unregisteredActivities.map(a => (
                <option key={a.id} value={a.id}>
                  {a.emoji ? `${a.emoji} ` : ""}{a.name} — {a.day} {formatTime(a.start_time)}
                </option>
              ))}
            </select>
            <button
              onClick={addRegistration}
              disabled={!selectedActivityId || saving}
              className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Adding…" : "Add"}
            </button>
          </div>
        )}

        {sortedDays.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
            <p className="text-gray-400 text-sm">No activities registered.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDays.map(day => (
              <div key={day}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{formatDay(day)}</p>
                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {byDay[day].map(act => (
                    <div key={act.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-2">
                        {act.emoji && <span>{act.emoji}</span>}
                        <span className="text-sm font-medium">{act.name}</span>
                        <span className="text-sm text-gray-400">{formatTime(act.start_time)} – {formatTime(act.end_time)}</span>
                      </div>
                      <button
                        onClick={() => removeRegistration(act.id)}
                        className="text-xs text-gray-400 hover:text-red-600 underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
