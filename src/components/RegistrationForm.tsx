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

const RAINBOW = ["#d93025", "#f5810e", "#f5c23e", "#5dbb46", "#4b96f3", "#7c3aed", "#e879a8"] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function RegistrationForm({
  activities,
  tracks,
  series,
  campName,
}: Props) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [userSelections, setUserSelections] = useState<Record<string, string>>({});
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmation | null>(null);
  const [logoMissing, setLogoMissing] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [formLoadedAt] = useState(() => Date.now());

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

  function handleSeriesConfirm(slotKey: string, activity: ActivityWithSpots, companionSlotKeys: string[]) {
    setUserSelections((prev) => {
      const next = { ...prev };
      next[slotKey] = activity.id;
      for (const key of companionSlotKeys) delete next[key];
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
        _t: formLoadedAt,
        _hp: honeypot,
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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center">
          {/* Rainbow confetti bar */}
          <div className="h-2 rounded-full mb-8" style={{ background: `linear-gradient(to right, ${RAINBOW.join(", ")})` }} />

          <div
            className="text-6xl mb-6 inline-block"
            style={{ filter: "drop-shadow(0 2px 8px rgba(124,58,237,0.3))" }}
          >
            🎉
          </div>

          <h1 className="text-3xl font-bold mb-3">
            You&apos;re in,{" "}
            <span
              style={{
                background: `linear-gradient(to right, #e879a8, #7c3aed, #4b96f3)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {confirmed.displayName}!
            </span>
          </h1>
          <p className="text-gray-600 mb-8 text-lg">
            We&apos;re so excited to have you at {campName}. Here&apos;s your
            personal schedule link — bookmark it to view and update your
            workshops anytime.
          </p>

          <div className="bg-white rounded-xl border-2 border-purple-100 p-4 font-mono text-sm break-all mb-8 text-left text-gray-700 shadow-sm">
            {scheduleUrl}
          </div>

          <a
            href={scheduleUrl}
            className="inline-block text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:opacity-90 transition-opacity"
            style={{ background: `linear-gradient(to right, #e879a8, #7c3aed, #4b96f3)` }}
          >
            View your schedule →
          </a>

          <div className="h-2 rounded-full mt-8" style={{ background: `linear-gradient(to right, ${RAINBOW.join(", ")})` }} />
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Rainbow banner */}
      <div className="h-2" style={{ background: `linear-gradient(to right, ${RAINBOW.join(", ")})` }} />

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto py-12 px-4 space-y-10"
      >
        {/* ── Logo + Header ── */}
        <div className="text-center space-y-4">
          {!logoMissing && (
            <div className="flex justify-center">
              {/* Save your logo to /public/queer-camp-logo.png */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/queer-camp-logo.png"
                alt="Queer Camp"
                width={140}
                height={140}
                className="drop-shadow-md"
                onError={() => setLogoMissing(true)}
              />
            </div>
          )}
          <h1
            className="text-4xl font-extrabold tracking-tight"
            style={{
              background: `linear-gradient(to right, #d93025, #f5810e, #f5c23e, #5dbb46, #4b96f3, #7c3aed, #e879a8)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Register for {campName}
          </h1>
          <p className="text-gray-500 text-base">
            You belong here. Let&apos;s get you set up!
          </p>
        </div>

        {/* ── Identity ── */}
        <Card color="#e879a8">
          <SectionHeader color="#e879a8">Your Info</SectionHeader>

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

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.legal_same_as_chosen}
              onChange={(e) => set("legal_same_as_chosen", e.target.checked)}
              className="w-4 h-4 accent-purple-600"
            />
            <span className="text-sm font-medium text-gray-800">
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
            <p className="text-xs text-gray-600 mt-1">
              We&apos;ll send your personal schedule link here.
            </p>
          </Field>
        </Card>

        {/* ── Track Selection ── */}
        {tracks.length > 0 && (
          <Card color="#7c3aed">
            <SectionHeader color="#7c3aed">Morning Track</SectionHeader>
            <p className="text-sm text-gray-500 -mt-2">
              Choose one track for your morning sessions.
            </p>
            <div className="space-y-2 mt-2">
              {tracks.map((track) => {
                const isFull = track.spots_left <= 0;
                const isSelected = selectedTrackId === track.id;
                const isLow = track.spots_left > 0 && track.spots_left <= 3;
                return (
                  <label
                    key={track.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isFull
                        ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-300"
                        : isSelected
                          ? "border-purple-500 bg-purple-50 shadow-sm"
                          : "border-gray-400 bg-white hover:border-purple-400 hover:bg-purple-50/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="track"
                      value={track.id}
                      checked={isSelected}
                      disabled={isFull}
                      onChange={() => setSelectedTrackId(track.id)}
                      className="mt-0.5 accent-purple-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900">
                        {track.emoji ? `${track.emoji} ` : ""}
                        {track.name}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {formatTime(track.start_time)} –{" "}
                        {formatTime(track.end_time)}
                      </div>
                      {track.description && (
                        <div className="text-xs text-gray-700 mt-1">
                          {track.description}
                        </div>
                      )}
                      <div className="text-xs mt-1 font-semibold">
                        {isFull ? (
                          <span className="text-red-700">⛔ Full — no spots remaining</span>
                        ) : isLow ? (
                          <span className="text-amber-700">⚠ Only {track.spots_left} spot{track.spots_left === 1 ? "" : "s"} left!</span>
                        ) : (
                          <span className="text-gray-500">{track.spots_left} spots left</span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-purple-600 font-bold text-lg mt-0.5" aria-label="Selected">✓</span>
                    )}
                  </label>
                );
              })}
            </div>
          </Card>
        )}

        {/* ── Workshop Selection ── */}
        <Card color="#4b96f3">
          <SectionHeader color="#4b96f3">Workshop Selection</SectionHeader>
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
              onSeriesConfirm={handleSeriesConfirm}
            />
          )}
        </Card>

          {/* Honeypot — off-screen, invisible to real users, bots fill it in */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}>
          <label htmlFor="hp_url">Website</label>
          <input
            id="hp_url"
            name="hp_url"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full text-white py-4 px-6 rounded-full font-bold text-lg shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          style={{ background: `linear-gradient(to right, #e879a8, #7c3aed, #4b96f3)` }}
        >
          {submitting ? "Getting you registered…" : "Register for Camp 🏕️"}
        </button>
      </form>

      {/* Rainbow footer bar */}
      <div className="h-2" style={{ background: `linear-gradient(to right, ${RAINBOW.join(", ")})` }} />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const input =
  "w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow placeholder:text-gray-400";

function Card({ children, color }: { children: ReactNode; color: string }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-6 space-y-4 border-t-4"
      style={{ borderTopColor: color }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ children, color }: { children: ReactNode; color: string }) {
  return (
    <h2 className="text-xl font-bold" style={{ color }}>
      {children}
    </h2>
  );
}

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
      <label className="block text-sm font-semibold text-gray-900">
        {label}
        {required && <span className="text-pink-600 ml-1" aria-hidden="true">*</span>}
      </label>
      {children}
    </div>
  );
}
