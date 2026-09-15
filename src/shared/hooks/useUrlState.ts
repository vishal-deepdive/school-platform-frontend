import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "./useDebounce";

type UrlValue = string | number;
export type UrlStateDefaults = Record<string, UrlValue>;

export interface UrlStateUpdateOptions {
  /** Add a history entry (tab/view switches) instead of replacing it (filter tweaks). */
  push?: boolean;
}

/**
 * View state — filters, tab, page — kept in the query string so refresh,
 * Back/Forward and shared links all land on the same view.
 *
 * `defaults` must be stable (module-level or memoized): it both types the
 * state and decides what stays out of the URL, since a key equal to its
 * default is dropped. Number keys parse and fall back to their default. When
 * the defaults include `page`, any patch that doesn't set `page` resets it,
 * because changing what's listed should start again from page 1.
 */
export function useUrlState<T extends UrlStateDefaults>(defaults: T) {
  const [params, setParams] = useSearchParams();

  const state = useMemo(() => {
    const out: Record<string, UrlValue> = {};
    for (const key of Object.keys(defaults)) {
      const raw = params.get(key);
      const fallback = defaults[key];
      if (raw === null) {
        out[key] = fallback;
      } else if (typeof fallback === "number") {
        const parsed = Number(raw);
        out[key] = raw !== "" && Number.isFinite(parsed) ? parsed : fallback;
      } else {
        out[key] = raw;
      }
    }
    return out as T;
  }, [params, defaults]);

  const update = useCallback(
    (patch: Partial<T>, options: UrlStateUpdateOptions = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const key of Object.keys(patch)) {
            const value = patch[key];
            if (value === undefined || value === defaults[key]) next.delete(key);
            else next.set(key, String(value));
          }
          if ("page" in defaults && !("page" in patch)) next.delete("page");
          return next;
        },
        { replace: !options.push },
      );
    },
    [setParams, defaults],
  );

  return [state, update] as const;
}

/**
 * A text box whose committed value lives in the URL. Typing updates the
 * returned value immediately; the trimmed text is pushed through `commit`
 * once typing pauses. URL changes from elsewhere (Back, "Clear filters") flow
 * back into the box. Callers clearing filters should also reset the box via
 * the returned setter, in case a keystroke is still waiting to be committed.
 */
export function useUrlSearch(urlValue: string, commit: (value: string) => void, delay = 350) {
  const [value, setValue] = useState(urlValue);
  const debounced = useDebounce(value.trim(), delay);
  const committed = useRef(urlValue);
  const commitRef = useRef(commit);

  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  useEffect(() => {
    if (urlValue !== committed.current) {
      committed.current = urlValue;
      setValue(urlValue);
    }
  }, [urlValue]);

  useEffect(() => {
    if (debounced === committed.current) return;
    committed.current = debounced;
    commitRef.current(debounced);
  }, [debounced]);

  return [value, setValue] as const;
}
