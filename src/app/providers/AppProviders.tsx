import { type ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ErrorBoundary } from "@/shared/components/errors/ErrorBoundary";
import { OfflineGate } from "@/shared/components/errors/OfflineGate";
import { Toaster } from "@/shared/components/ui/Toaster";
import { TooltipProvider } from "@/shared/components/ui/Tooltip";
import { useActiveSchoolStore } from "@/shared/store/activeSchool";
import { createPersistOptions } from "@/shared/api/queryPersistence";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const persistOptions = createPersistOptions(queryClient);

// Global safety net for admin school switching. Every school-scoped read keys
// itself by the active school (see useSchoolScopedQuery), but this guarantees
// that *any* mounted query refetches when the admin changes school — so no view
// can ever keep another school's data on screen, even if a call site forgets to
// include the school in its key. Fires only on an actual id change (not on the
// initial persist rehydration, which keeps the same id).
let lastActiveSchoolId = useActiveSchoolStore.getState().school?.id;
useActiveSchoolStore.subscribe((state) => {
  const id = state.school?.id;
  if (id !== lastActiveSchoolId) {
    lastActiveSchoolId = id;
    void queryClient.invalidateQueries();
  }
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
      >
        <TooltipProvider delayDuration={300} skipDelayDuration={100}>
          <OfflineGate>{children}</OfflineGate>
          <Toaster />
        </TooltipProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}
