import { QueryClient } from "@tanstack/react-query";

/**
 * The app's one React Query cache, shared so non-React modules can reset it.
 *
 * Most cached queries (products, above all) answer for whichever client or
 * Brand Saya entry is picked, via the X-Client-Id header — but their keys do
 * not say whose data they hold. Switching the pick therefore has to drop the
 * cache; otherwise, for up to staleTime, every tool keeps offering the
 * previous brand's products. See resetClientScopedCache().
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

/** Call whenever the X-Client-Id the API sends changes (picker or view-as). */
export function resetClientScopedCache() {
  queryClient.clear();
}
