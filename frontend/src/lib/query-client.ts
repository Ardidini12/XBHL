import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"

import { ApiError } from "@/client"

const handleApiError = (error: Error) => {
  if (error instanceof ApiError && [401, 403].includes(error.status)) {
    localStorage.removeItem("access_token")
    window.location.href = "/login"
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleApiError,
  }),
  mutationCache: new MutationCache({
    onError: handleApiError,
  }),
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes — data stays fresh, no needless refetches
      gcTime: 5 * 60 * 1000, // 5 minutes — keep unused cache entries longer
      refetchOnWindowFocus: false, // don't refetch when tabbing back
      retry: 1, // single retry on failure
    },
  },
})
