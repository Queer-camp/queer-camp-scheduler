"use client";

import { useState, FormEvent, ReactNode } from "react";

interface FormData {
  legal_first_name: string;
  legal_last_name: string;
  chosen_name: string;
  pronouns: string;
  email: string;
  guardian_first_name: string;
  guardian_last_name: string;
  guardian_email: string;
  guardian_phone: string;
  guardian_relationship: string;
  emergency_same_as_guardian: boolean;
  emergency_first_name: string;
  emergency_last_name: string;
  emergency_phone: string;
  emergency_relationship: string;
}

const EMPTY_FORM: FormData = {
  legal_first_name: "",
  legal_last_name: "",
  chosen_name: "",
  pronouns: "",
  email: "",
  guardian_first_name: "",
  guardian_last_name: "",
  guardian_email: "",
  guardian_phone: "",
  guardian_relationship: "",
  emergency_same_as_guardian: false,
  emergency_first_name: "",
  emergency_last_name: "",
  emergency_phone: "",
  emergency_relationship: "",
};

interface Confirmation {
  token: string;
  displayName: string;
}

export default function RegistrationForm() {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmation | null>(null);

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setConfirmed({
      token: data.token,
      displayName: form.chosen_name.trim() || form.legal_first_name,
    });
    setSubmitting(false);
  }

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

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto py-12 px-4 space-y-10"
    >
      <h1 className="text-3xl font-bold">Register for Camp</h1>

      {/* ── Camper Info ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Camper Info</h2>

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

        <Field label="Chosen name" hint="If different from legal name">
          <input
            type="text"
            value={form.chosen_name}
            onChange={(e) => set("chosen_name", e.target.value)}
            className={input}
          />
        </Field>

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

      {/* ── Parent / Guardian ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">
          Parent / Guardian
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" required>
            <input
              type="text"
              required
              value={form.guardian_first_name}
              onChange={(e) => set("guardian_first_name", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Last name" required>
            <input
              type="text"
              required
              value={form.guardian_last_name}
              onChange={(e) => set("guardian_last_name", e.target.value)}
              className={input}
            />
          </Field>
        </div>

        <Field label="Email" required>
          <input
            type="email"
            required
            value={form.guardian_email}
            onChange={(e) => set("guardian_email", e.target.value)}
            className={input}
          />
        </Field>

        <Field label="Phone" required>
          <input
            type="tel"
            required
            value={form.guardian_phone}
            onChange={(e) => set("guardian_phone", e.target.value)}
            className={input}
          />
        </Field>

        <Field label="Relationship to camper" required>
          <input
            type="text"
            required
            placeholder="e.g. Parent, Grandparent, Guardian"
            value={form.guardian_relationship}
            onChange={(e) => set("guardian_relationship", e.target.value)}
            className={input}
          />
        </Field>
      </section>

      {/* ── Emergency Contact ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">
          Emergency Contact
        </h2>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.emergency_same_as_guardian}
            onChange={(e) =>
              set("emergency_same_as_guardian", e.target.checked)
            }
            className="w-4 h-4"
          />
          <span className="text-gray-700">Same as parent / guardian</span>
        </label>

        {!form.emergency_same_as_guardian && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First name" required>
                <input
                  type="text"
                  required
                  value={form.emergency_first_name}
                  onChange={(e) => set("emergency_first_name", e.target.value)}
                  className={input}
                />
              </Field>
              <Field label="Last name" required>
                <input
                  type="text"
                  required
                  value={form.emergency_last_name}
                  onChange={(e) => set("emergency_last_name", e.target.value)}
                  className={input}
                />
              </Field>
            </div>

            <Field label="Phone" required>
              <input
                type="tel"
                required
                value={form.emergency_phone}
                onChange={(e) => set("emergency_phone", e.target.value)}
                className={input}
              />
            </Field>

            <Field label="Relationship to camper" required>
              <input
                type="text"
                required
                placeholder="e.g. Parent, Grandparent, Aunt"
                value={form.emergency_relationship}
                onChange={(e) =>
                  set("emergency_relationship", e.target.value)
                }
                className={input}
              />
            </Field>
          </div>
        )}
      </section>

      {/* ── Workshop Selection (placeholder) ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">
          Workshop Selection
        </h2>
        <div className="rounded border-2 border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
          Workshop selection coming soon
        </div>
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

// ── Helpers ──────────────────────────────────────────────────────────────────

const input =
  "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {children}
    </div>
  );
}
