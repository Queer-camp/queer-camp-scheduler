"use client";

import { useState, useMemo, FormEvent, ReactNode } from "react";
import type {
  ActivityWithSpots,
  TrackWithSpots,
  ActivitySeries,
} from "@/types/database";
import WorkshopSlots, { buildTimeSlots } from "@/components/WorkshopSlots";
import { formatTime } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  chosen_first_name: string;
  chosen_last_name: string;
  legal_same_as_chosen: boolean;
  legal_first_name: string;
  legal_last_name: string;
  pronouns: string;
  email: string;
}

interface Confirmation {
  token: string;
  displayName: string;
}

interface Props {
  activities: ActivityWithSpots[];
  tracks: TrackWithSpots[];
  series: ActivitySeries[];
  campName: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormData = {
  chosen_first_name: "",
  chosen_last_name: "",
  legal_same_as_chosen: false,
  legal_first_name: "",
  legal_last_name: "",
  pronouns: "",
  email: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RegistrationForm({
  activities,
  tracks,
  series,
  campName,
}: Props) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [userSelections, setUserSelections] = useState<Record<string, string>>(
    {}
  );
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmation | null>(null);

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const timeSlots = useMemo(() => buildTimeSlots(activities), [activities]);

  const effectiveSelections = useMemo(() => {
    const result = { ...userSelections };
    for (const activityId of Object.values(userSelections)) {
      const picked = activities.find((a) => a.id === activityId);
      if (!picked?.series_id) continue;
      for (const partner of activities) {
        if (partner.series_id !== picked.series_id || partner.id === activityId)
          continue;
        const key = `${partner.day}|${partner.start_time}|${partner.end_time}`;
        if (!result[key]) result[key] = partner.id;
      }
    }
    return result;
  }, [userSelections, activities]);

  function handleSlotClick(slotKey: string, activity: ActivityWithSpots) {
    if (slotKey in effectiveSelections && !(slotKey in userSelections)) return;
    setUserSelections((prev) => {
      const next = { ...prev };
      if (prev[slotKey] === activity.id) {
        delete next[slotKey];
      } else {
        next[slotKey] = activity.id;
      }
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chosen_first_name: form.chosen_first_name.trim(),
        chosen_last_name: form.chosen_last_name.trim(),
        legal_first_name: form.legal_same_as_chosen
          ? form.chosen_first_name.trim()
          : form.legal_first_name.trim(),
        legal_last_name: form.legal_same_as_chosen
          ? form.chosen_last_name.trim()
          : form.legal_last_name.trim(),
        pronouns: form.pronouns.trim() || null,
        email: form.email.trim().toLowerCase(),
        track_id: selectedTrackId,
        activity_ids: Object.values(effectiveSelections),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setConfirmed({
      token: data.token,
      displayName: `${form.chosen_first_name.trim()} ${form.chosen_last_name.trim()}`,
    });
    setSubmitting(false);
  }

  // ── Confirmation screen ────────────────────────────────────────────────────

  if (confirmed) {
    const scheduleUrl = `${window.location.origin}/schedule?token=${confirmed.token}`;
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold mb-3">
          You&apos;re registered, {confirmed.displayName}!
        </h1>
        <p className="text-gray-700 mb-6">
          Here&apos;s your personal schedule link. Bookmark it — this is how
          you&apos;ll view and edit your workshops.
        </p>
        <div className="bg-gray-100 rounded p-4 font-mono text-sm break-all mb-6">
          {scheduleUrl}
        </div>
        <a
          href={scheduleUrl}
          className="inline-block bg-black text-white px-6 py-3 rounded font-semibold hover:bg-gray-800"
        >
          View your schedule →
        </a>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto py-12 px-4 space-y-10"
    >
      <h1 className="text-3xl font-bold">Register for {campName}</h1>

      {/* ── Identity ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Your Info</h2>

        {/* Chosen name — primary identity */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Chosen first name" required>
            <input
              type="text"
              required
              value={form.chosen_first_name}
              onChange={(e) => set("chosen_first_name", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Chosen last name" required>
            <input
              type="text"
              required
              value={form.chosen_last_name}
              onChange={(e) => set("chosen_last_name", e.target.value)}
              className={input}
            />
          </Field>
        </div>

        {/* Legal name */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.legal_same_as_chosen}
            onChange={(e) => set("legal_same_as_chosen", e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-700">
            Legal name is the same as chosen name
          </span>
        </label>

        {!form.legal_same_as_chosen && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Legal first name" required>
              <input
                type="text"
                required
                value={form.legal_first_name}
                onChange={(e) => set("legal_first_name", e.target.value)}
                className={input}
              />
            </Field>
            <Field label="Legal last name" required>
              <input
                type="text"
                required
                value={form.legal_last_name}
                onChange={(e) => set("legal_last_name", e.target.value)}
                className={input}
              />
            </Field>
          </div>
        )}

        <Field label="Pronouns">
          <input
            type="text"
            placeholder="e.g. she/her, they/them, he/him"
            value={form.pronouns}
            onChange={(e) => set("pronouns", e.target.value)}
            className={input}
          />
        </Field>

        <Field label="Email" required>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={input}
          />
        </Field>
      </section>

      {/* ── Track Selection ── */}
      {tracks.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">
            Morning Track
          </h2>
          <p className="text-sm text-gray-600">
            Choose one track for your morning sessions.
          </p>
          <div className="space-y-2">
            {tracks.map((track) => {
              const isFull = track.spots_left <= 0;
              const isSelected = selectedTrackId === track.id;
              const isLow = track.spots_left > 0 && track.spots_left <= 3;
              return (
                <label
                  key={track.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    isFull
                      ? "opacity-50 cursor-not-allowed bg-gray-50"
                      : isSelected
                        ? "border-black bg-gray-50"
                        : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="track"
                    value={track.id}
                    checked={isSelected}
                    disabled={isFull}
                    onChange={() => setSelectedTrackId(track.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {track.emoji ? `${track.emoji} ` : ""}
                      {track.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatTime(track.start_time)} –{" "}
                      {formatTime(track.end_time)}
                    </div>
                    {track.description && (
                      <div className="text-xs text-gray-600 mt-1">
                        {track.description}
                      </div>
                    )}
                    <div
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
                          ? `${track.spots_left} spot${track.spots_left === 1 ? "" : "s"} left!`
                          : `${track.spots_left} spots left`}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Workshop Selection ── */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">
          Workshop Selection
        </h2>
        {timeSlots.length === 0 ? (
          <p className="text-sm text-gray-400">
            No workshops have been added for this camp yet.
          </p>
        ) : (
          <WorkshopSlots
            timeSlots={timeSlots}
            series={series}
            activities={activities}
            userSelections={userSelections}
            effectiveSelections={effectiveSelections}
            onSlotClick={handleSlotClick}
          />
        )}
      </section>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-black text-white py-3 px-6 rounded font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Registering…" : "Register"}
      </button>
    </form>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const input =
  "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
