import { useState, useCallback } from 'react';
import { NAV } from '~/components/Layout';

const STORAGE_KEY = 'buildsync:bottom_nav_shortcuts';
const DEFAULT_SHORTCUTS = ['/photos', '/notes'];

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

  const setShortcuts = useCallback((next: string[]) => {
    setShortcutsState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  return [shortcuts, setShortcuts] as const;
}
