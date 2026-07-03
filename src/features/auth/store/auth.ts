import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, TokenResponse } from "@/features/auth/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (tokens: TokenResponse, user: User) => void;
  logout: () => void;
  setTokens: (tokens: Pick<TokenResponse, "access_token">) => void;
  updateUser: (user: Partial<User>) => void;
}

// NOTE: the refresh token is deliberately NOT stored here. It is delivered by the
// backend as an HttpOnly cookie (scoped to /api/v1/auth) so it is unreachable
// from JS — an XSS payload can read this store but never the refresh token. Only
// the short-lived access token lives in the (persisted) store.
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: (tokens, user) =>
        set({
          user,
          accessToken: tokens.access_token,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        }),

      setTokens: ({ access_token }) => set({ accessToken: access_token }),

      updateUser: (partial) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...partial } });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Keep auth state in sync across browser tabs. When one tab rotates the access
// token (or logs out), other tabs re-hydrate from localStorage so they pick up
// the latest access token before their next request. The refresh token itself
// lives in a shared HttpOnly cookie, so all tabs already send the same one.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "auth-storage") {
      void useAuthStore.persist.rehydrate();
    }
  });
}
