'use client';

import { useState, useEffect, useCallback } from 'react';

function parseSessionValue<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return (raw as unknown) as T;
  }
}

/**
 * Persists state in sessionStorage so that refreshing the page (F5 / Reload)
 * keeps the exact view mode, tab, or filter the user had applied.
 * When the browser tab / app is closed and reopened, sessionStorage is cleared
 * by the browser (and by SessionRouteGuard), resetting to defaultValue.
 *
 * IMPORTANT: Never writes defaultValue back to sessionStorage on mount,
 * avoiding any mount/StrictMode race condition that could overwrite saved state.
 */
export function useSessionState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.sessionStorage.getItem(key);
        if (raw !== null) {
          return parseSessionValue<T>(raw, defaultValue);
        }
      } catch {}
    }
    return defaultValue;
  });

  // Ensure client hydration restores the value from sessionStorage if SSR rendered defaultValue
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw !== null) {
        setState(parseSessionValue<T>(raw, defaultValue));
      }
    } catch {}
  }, [key]);

  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next =
          typeof value === 'function'
            ? (value as (prevState: T) => T)(prev)
            : value;
        if (typeof window !== 'undefined') {
          try {
            window.sessionStorage.setItem('agencia_session_active', '1');
            if (next === undefined) {
              window.sessionStorage.removeItem(key);
            } else {
              window.sessionStorage.setItem(key, JSON.stringify(next));
            }
          } catch {}
        }
        return next;
      });
    },
    [key]
  );

  return [state, setPersistedState];
}
