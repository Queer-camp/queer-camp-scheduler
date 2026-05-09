import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/camps"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-400 transition-colors"
        >
          <h2 className="font-semibold text-lg mb-1">Camps</h2>
          <p className="text-sm text-gray-600">Create and manage camps, tracks, and activities.</p>
        </Link>
        <Link
          href="/admin/campers"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-400 transition-colors"
        >
          <h2 className="font-semibold text-lg mb-1">Campers</h2>
          <p className="text-sm text-gray-600">View registrations, edit schedules, send links.</p>
        </Link>
      </div>
    </div>
  );
}
