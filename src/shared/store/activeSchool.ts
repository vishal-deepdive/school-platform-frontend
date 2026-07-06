import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/features/auth/store/auth";

/** The school an admin is currently "acting as" across the whole app. */
export interface ActiveSchool {
  id: string;
  name: string;
}

interface ActiveSchoolState {
  school: ActiveSchool | null;
  setSchool: (school: ActiveSchool | null) => void;
  clear: () => void;
}

/**
 * Global "active school" selection for platform admins.
 *
 * Non-admins are auto-scoped to their own school server-side and never touch
 * this store — `useActiveSchool` reads their `school_id` straight off the user.
 * For admins this is the single source of truth every operational module reads
 * from, replacing the old per-page school pickers.
 *
 * Persisted to localStorage so the choice survives reloads, and kept in sync
 * across tabs (mirrors the auth-store pattern).
 */
export const useActiveSchoolStore = create<ActiveSchoolState>()(
  persist(
    (set) => ({
      school: null,
      setSchool: (school) => set({ school }),
      clear: () => set({ school: null }),
    }),
    {
      name: "active-school",
      partialize: (state) => ({ school: state.school }),
    },
  ),
);

if (typeof window !== "undefined") {
  // Drop the selection on any auth transition (login or logout): a fresh login
  // — possibly a different admin — must start clean so the gate re-prompts, and
  // logout must never leave a stale school behind for the next user. A silent
  // token refresh keeps `isAuthenticated` unchanged, so it never fires here.
  useAuthStore.subscribe((state, prev) => {
    if (state.isAuthenticated !== prev.isAuthenticated) {
      useActiveSchoolStore.getState().clear();
    }
  });

  // Keep the selection in sync across browser tabs.
  window.addEventListener("storage", (event) => {
    if (event.key === "active-school") {
      void useActiveSchoolStore.persist.rehydrate();
    }
  });
}
