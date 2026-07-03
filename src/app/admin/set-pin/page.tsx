"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const inputCls =
  "w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-lg tracking-[0.5em] text-center dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function SetPinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstLogin = searchParams.get("first") === "1";

  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setHasPin(!!data.hasPin);
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (pin.length !== 4) {
      setError("PIN must be exactly 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/set-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setSaving(false);
    if (res.ok) {
      if (isFirstLogin) {
        router.push("/admin?welcome=1");
        return;
      }
      setHasPin(true);
      setSuccess("PIN updated.");
      setPin("");
      setConfirmPin("");
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to set PIN.");
    }
  }

  async function handleRemove() {
    if (!confirm("Remove your PIN? You'll need the email link to sign in until you set a new one.")) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/admin/set-pin", { method: "DELETE" });
    setSaving(false);
    if (res.ok) {
      setHasPin(false);
      setSuccess("PIN removed.");
    }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-2">{isFirstLogin ? "Set a PIN" : "Change your PIN"}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {isFirstLogin
          ? "Set a 4-digit PIN so next time you can sign in with just your email and PIN — no need to check your email."
          : "Update the 4-digit PIN you use to sign in."}
      </p>

      {success && (
        <p className="mb-4 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-4 py-3">
          {success}
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-4 py-3">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New PIN</label>
          <input
            required
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoFocus
            value={pin}
            onChange={(e) => setPin(digitsOnly(e.target.value))}
            className={inputCls}
            placeholder="••••"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm PIN</label>
          <input
            required
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(digitsOnly(e.target.value))}
            className={inputCls}
            placeholder="••••"
          />
        </div>

        <div className="flex items-center gap-4 pt-1">
          <button
            type="submit"
            disabled={saving || pin.length !== 4 || confirmPin.length !== 4}
            className="bg-black text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : hasPin ? "Update PIN" : "Set PIN"}
          </button>
          {isFirstLogin && (
            <button
              type="button"
              onClick={() => router.push("/admin?welcome=1")}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Skip for now
            </button>
          )}
          {!isFirstLogin && hasPin && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50"
            >
              Remove PIN
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function SetPinPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}>
      <SetPinForm />
    </Suspense>
  );
}
