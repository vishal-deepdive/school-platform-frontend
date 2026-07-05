import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/shared/components/errors/ErrorBoundary";
import { OfflineGate } from "@/shared/components/errors/OfflineGate";
import { Toaster } from "@/shared/components/ui/Toaster";

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

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OfflineGate>{children}</OfflineGate>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
