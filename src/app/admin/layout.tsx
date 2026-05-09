import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">Queer Camp Admin</span>
          <Link href="/admin/camps" className="text-sm text-gray-600 hover:text-gray-900">
            Camps
          </Link>
          <Link href="/admin/campers" className="text-sm text-gray-600 hover:text-gray-900">
            Campers
          </Link>
        </div>
        <form action="/api/admin/logout" method="POST">
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
            Sign out
          </button>
        </form>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
