import { useEffect, useState } from "react";

/**
 * useState whose value is mirrored to localStorage under `key`, so a teacher's
 * last-used class/section/session selections survive a page reload. Falls back to
 * `initial` when nothing is stored or storage is unavailable (e.g. SSR/private mode).
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [key, value]);

  return [value, setValue];
}
