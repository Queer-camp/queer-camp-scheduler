import { createAdminClient } from "@/lib/supabase";
import { getActiveCampId } from "@/lib/constants";
import RegistrationForm from "@/components/RegistrationForm";
import type { ActivityWithSpots, TrackWithSpots } from "@/types/database";

export const dynamic = "force-dynamic";
export const metadata = { title: "Register — Queer Camp" };

export default async function RegisterPage() {
  const campId = await getActiveCampId();

  if (!campId) {
    return <ClosedPage />;
  }

  const supabase = createAdminClient();

  const [
    { data: activities, error: actErr },
    { data: tracks },
    { data: series },
    { data: camp },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("camp_id", campId)
      .order("day")
      .order("start_time"),
    supabase
      .from("tracks")
      .select("*")
      .eq("camp_id", campId)
      .order("start_time"),
    supabase.from("activity_series").select("*").eq("camp_id", campId),
    supabase
      .from("camps")
      .select("name, registration_open")
      .eq("id", campId)
      .single(),
  ]);

  if (actErr) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-red-600">
        Failed to load registration. Please try again later.
      </div>
    );
  }

  if (camp && !camp.registration_open) {
    return <ClosedPage campName={camp.name} />;
  }

  const activityIds = (activities ?? []).map((a) => a.id);
  const [{ data: regRows }, { data: trackCamperRows }] = await Promise.all([
    activityIds.length
      ? supabase
          .from("registrations")
          .select("activity_id")
          .in("activity_id", activityIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("campers")
      .select("track_id")
      .eq("camp_id", campId)
      .not("track_id", "is", null),
  ]);

  const regCountByActivity: Record<string, number> = {};
  for (const r of regRows ?? []) {
    regCountByActivity[r.activity_id] =
      (regCountByActivity[r.activity_id] ?? 0) + 1;
  }

  const camperCountByTrack: Record<string, number> = {};
  for (const c of trackCamperRows ?? []) {
    if (c.track_id) {
      camperCountByTrack[c.track_id] =
        (camperCountByTrack[c.track_id] ?? 0) + 1;
    }
  }

  const activitiesWithSpots: ActivityWithSpots[] = (activities ?? []).map(
    (a) => ({
      ...a,
      spots_left: a.capacity - (regCountByActivity[a.id] ?? 0),
    })
  );

  const tracksWithSpots: TrackWithSpots[] = (tracks ?? []).map((t) => ({
    ...t,
    spots_left: t.capacity - (camperCountByTrack[t.id] ?? 0),
  }));

  return (
    <RegistrationForm
      activities={activitiesWithSpots}
      tracks={tracksWithSpots}
      series={series ?? []}
      campName={camp?.name ?? "Camp"}
    />
  );
}

const RAINBOW = "#d93025, #f5810e, #f5c23e, #5dbb46, #4b96f3, #7c3aed, #e879a8";

function ClosedPage({ campName }: { campName?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col">
      <div className="h-2" style={{ background: `linear-gradient(to right, ${RAINBOW})` }} />

      <div className="px-4 pt-12 pb-16">
        <div className="max-w-lg mx-auto text-center space-y-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/queer-camp-logo.png" alt="Queer Camp" className="h-28 w-auto mx-auto drop-shadow-md" />

          <h1
            className="text-4xl font-extrabold tracking-tight"
            style={{
              background: `linear-gradient(to right, ${RAINBOW})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {campName ? campName : "Queer Camp"}
          </h1>

          <p className="text-xl font-semibold text-gray-700">
            Registration isn&apos;t open just yet.
          </p>

          <p className="text-gray-500 text-base leading-relaxed">
            We&apos;re not quite ready to take sign-ups, but we&apos;d love for
            you to stay in the loop. Head over to our website to learn about
            upcoming events, announcements, and when registration opens.
          </p>

          <a
            href="https://www.queer.camp/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:opacity-90 transition-opacity"
            style={{ background: `linear-gradient(to right, #e879a8, #7c3aed, #4b96f3)` }}
          >
            Stay up to date at queer.camp →
          </a>

          <p className="text-sm text-gray-400">
            Already registered?{" "}
            <a href="/get-link" className="underline hover:text-gray-600">
              Get your schedule link
            </a>
          </p>
        </div>
      </div>

      <div className="h-2" style={{ background: `linear-gradient(to right, ${RAINBOW})` }} />
    </div>
  );
}
