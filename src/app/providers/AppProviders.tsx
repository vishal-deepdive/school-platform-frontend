import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "@/shared/components/errors/ErrorBoundary";
import { useIsDark } from "@/shared/hooks/useIsDark";

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

function ThemedToaster() {
  const isDark = useIsDark();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: "10px",
          background: isDark ? "#1e293b" : "#ffffff",
          color: isDark ? "#f8fafc" : "#0f172a",
          border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
          fontSize: "14px",
          boxShadow: isDark
            ? "0 4px 16px rgba(0,0,0,0.4)"
            : "0 4px 16px rgba(0,0,0,0.08)",
        },
        success: {
          iconTheme: {
            primary: "#10b981",
            secondary: isDark ? "#f8fafc" : "#ffffff",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: isDark ? "#f8fafc" : "#ffffff",
          },
        },
      }}
    />
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        <ThemedToaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
