// Renders keyboard hint badges — hidden on touch devices via pointer media query.
// Use inside button labels: <button>New camp <ShortcutBadge>N</ShortcutBadge></button>
export function ShortcutBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="[@media(pointer:fine)]:inline-flex hidden items-center px-1.5 py-0.5 ml-1.5 text-xs font-mono bg-gray-100 border border-gray-300 rounded text-gray-400 leading-none">
      {children}
    </kbd>
  );
}
