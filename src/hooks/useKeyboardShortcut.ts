import { useEffect, useRef } from "react";

function isTyping(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((e.target as HTMLElement).isContentEditable) return true;
  return false;
}

export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (isTyping(e)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === key) {
        e.preventDefault();
        handlerRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, enabled]);
}

// For "g then c" style two-key sequences
export function useSequenceShortcuts(
  sequences: Record<string, () => void>,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const handlersRef = useRef(sequences);
  handlersRef.current = sequences;
  const pending = useRef<string | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (isTyping(e)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (pending.current) {
        clearTimeout(timeout.current);
        const seq = `${pending.current}${e.key}`;
        pending.current = null;
        const handler = handlersRef.current[seq];
        if (handler) { e.preventDefault(); handler(); }
        return;
      }

      const isPrefix = Object.keys(handlersRef.current).some(k => k.startsWith(e.key) && k.length > 1);
      if (isPrefix) {
        e.preventDefault();
        pending.current = e.key;
        timeout.current = setTimeout(() => { pending.current = null; }, 1000);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); clearTimeout(timeout.current); };
  }, [enabled]);
}
