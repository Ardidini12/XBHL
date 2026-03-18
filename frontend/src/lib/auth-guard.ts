import { redirect } from "@tanstack/react-router"

import { UsersService } from "@/client"
import { queryClient } from "@/lib/query-client"

/**
 * Cached superuser check for route `beforeLoad`.
 * Uses TanStack Query cache — only makes an API call if the cached user
 * data is missing or stale (default 2 min). This eliminates the blocking
 * HTTP round-trip on every page navigation.
 */
export async function ensureSuperuser() {
  try {
    const user = await queryClient.ensureQueryData({
      queryKey: ["currentUser"],
      queryFn: UsersService.readUserMe,
    })
    if (!user.is_superuser) {
      throw redirect({ to: "/" })
    }
  } catch (e) {
    if (e && typeof e === "object" && "to" in e) throw e
    throw redirect({ to: "/" })
  }
}
