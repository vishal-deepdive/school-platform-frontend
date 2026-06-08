import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "@/shared/components/errors/ErrorBoundary";

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

/**
 * App-wide context providers: error boundary, React Query, and the global
 * toast portal. Kept separate from <App> so route composition and provider
 * wiring stay independently testable.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "10px",
              background: "#1e293b",
              color: "#f8fafc",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#f8fafc" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#f8fafc" },
            },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
