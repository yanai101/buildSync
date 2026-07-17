import { useState, useCallback, useEffect } from 'react';
import { NAV } from '~/components/Layout';

const STORAGE_KEY = 'buildsync:bottom_nav_shortcuts';
const DEFAULT_SHORTCUTS = ['/photos', '/notes'];
// Custom event name to broadcast changes within the same tab
const CHANGE_EVENT = 'buildsync:bottom_nav_shortcuts_changed';

function readFromStorage(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUTS;
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      parsed.every((id: string) => NAV.some(n => n.id === id))
    ) {
      return parsed;
    }
  } catch {}
  return DEFAULT_SHORTCUTS;
}

export function useBottomNavShortcuts() {
  const [shortcuts, setShortcutsState] = useState<string[]>(() =>
    typeof window !== 'undefined' ? readFromStorage() : DEFAULT_SHORTCUTS
  );

  // Re-sync whenever another instance writes (same tab via custom event, or other tabs via storage event)
  useEffect(() => {
    const sync = () => setShortcutsState(readFromStorage());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setShortcuts = useCallback((next: string[]) => {
    setShortcutsState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // Broadcast to all other hook instances in the same tab
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {}
  }, []);

  return [shortcuts, setShortcuts] as const;
}
