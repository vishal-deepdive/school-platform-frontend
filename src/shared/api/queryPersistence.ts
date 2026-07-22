import type { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";

/**
 * Opt-in persistence for slow-changing reference/lookup data (class codes,
 * holiday calendars, static dropdown options, ...). Only queries tagged with
 * `meta: referenceDataMeta` are written to storage — everything else (user
 * data, records, anything school-sensitive) stays in-memory only and is
 * never written to disk.
 */
export const referenceDataMeta = { persist: true } as const;

/** Standard cache lifetimes for reference-data queries. */
export const REFERENCE_DATA_STALE_TIME = 10 * 60_000; // 10 min — treat as fresh
export const REFERENCE_DATA_GC_TIME = 20 * 60_000; // 20 min — evict from storage after

const STORAGE_KEY = "rq-reference-cache";

// sessionStorage: survives reloads within a tab (the common "don't refetch on
// every navigation" case) but clears when the tab closes, so nothing lingers
// long-term in the browser — matches "cache for a short time" without needing
// a separate cleanup pass.
const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
  key: STORAGE_KEY,
  throttleTime: 1_000,
});

export function createPersistOptions(
  queryClient: QueryClient,
): PersistQueryClientOptions {
  return {
    queryClient,
    persister,
    maxAge: REFERENCE_DATA_GC_TIME,
    // Bump this to invalidate all persisted caches on a breaking data-shape change.
    buster: "v1",
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.state.status === "success" && query.meta?.persist === true,
    },
  };
}
