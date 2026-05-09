import Link from "next/link";

const RAINBOW = "#d93025, #f5810e, #f5c23e, #5dbb46, #4b96f3, #7c3aed, #e879a8";

export default function AdminDashboard() {
  return (
    <div>
      <h1
        className="text-3xl font-extrabold tracking-tight mb-6"
        style={{
          background: `linear-gradient(to right, ${RAINBOW})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        Dashboard
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/camps"
          className="block p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-t-4 hover:shadow-md transition-shadow"
          style={{ borderTopColor: "#e879a8" }}
        >
          <h2 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">Camps</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Create and manage camps, tracks, and activities.</p>
        </Link>
        <Link
          href="/admin/campers"
          className="block p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-t-4 hover:shadow-md transition-shadow"
          style={{ borderTopColor: "#7c3aed" }}
        >
          <h2 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">Campers</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">View registrations, edit schedules, send links.</p>
        </Link>
      </div>
    </div>
  );
}
