import { useEffect, useRef } from 'react';

/** Exécute `callback` immédiatement puis toutes les `intervalMs`, tant que `enabled` est vrai. */
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;
    saved.current();
    const id = window.setInterval(() => saved.current(), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
}
