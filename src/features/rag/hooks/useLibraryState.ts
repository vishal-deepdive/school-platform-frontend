import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export type LibraryView = "browse" | "all";

/** Subject chip value for "every subject in the selected class". */
export const ALL_SUBJECTS = "__all__";

export interface LibraryState {
  view: LibraryView;
  /** Browse: "" falls back to the first class. All: "" means every class. */
  classLevel: string;
  /** Browse: "" falls back to the first subject; ALL_SUBJECTS lists them all. */
  subject: string;
  q: string;
  scope: string;
  board: string;
  medium: string;
  status: string;
  /** 1-based. */
  page: number;
}

const PARAM_KEYS: Record<keyof LibraryState, string> = {
  view: "view",
  classLevel: "class",
  subject: "subject",
  q: "q",
  scope: "scope",
  board: "board",
  medium: "medium",
  status: "status",
  page: "page",
};

const DEFAULTS: Partial<LibraryState> = { view: "browse", page: 1 };

/**
 * Textbook Library view state, kept in the URL so refresh, the Back button,
 * and shared links all land on the same class, subject, and filters.
 */
export function useLibraryState() {
  const [params, setParams] = useSearchParams();

  const state = useMemo<LibraryState>(
    () => ({
      view: params.get("view") === "all" ? "all" : "browse",
      classLevel: params.get("class") ?? "",
      subject: params.get("subject") ?? "",
      q: params.get("q") ?? "",
      scope: params.get("scope") ?? "",
      board: params.get("board") ?? "",
      medium: params.get("medium") ?? "",
      status: params.get("status") ?? "",
      page: Math.max(1, Number(params.get("page")) || 1),
    }),
    [params],
  );

  /**
   * Merge a patch into the URL. Filter/search tweaks replace the history entry
   * by default; pass `push` for navigation-like changes (class, subject, view)
   * so Back steps through them.
   */
  const update = useCallback(
    (patch: Partial<LibraryState>, options: { push?: boolean } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          (Object.keys(patch) as (keyof LibraryState)[]).forEach((field) => {
            const value = patch[field];
            const key = PARAM_KEYS[field];
            if (value === undefined || value === "" || value === DEFAULTS[field]) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });
          // Anything that changes what's listed starts again from page 1.
          if (!("page" in patch)) next.delete(PARAM_KEYS.page);
          return next;
        },
        { replace: !options.push },
      );
    },
    [setParams],
  );

  return [state, update] as const;
}
