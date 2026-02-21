import { useCallback, useState } from "react"
import { UsersService } from "../client"

export type AvailabilityStatus =
  | "idle"
  | "loading"
  | "available"
  | "unavailable"
  | "error"

interface UseAvailabilityCheckResult {
  status: AvailabilityStatus
  checkAvailability: (
    field: "email" | "gamertag",
    value: string,
  ) => Promise<void>
  reset: () => void
  errorMessage: string | null
}

export function useAvailabilityCheck(): UseAvailabilityCheckResult {
  const [status, setStatus] = useState<AvailabilityStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const checkAvailability = useCallback(
    async (field: "email" | "gamertag", value: string) => {
      if (!value || value.length < 2) {
        setStatus("idle")
        setErrorMessage(null)
        return
      }

      setStatus("loading")
      setErrorMessage(null)

      try {
        const query = field === "email" ? { email: value } : { gamertag: value }
        const response = await UsersService.checkAvailability(query)

        if (response.available) {
          setStatus("available")
        } else {
          setStatus("unavailable")
        }
      } catch (error: any) {
        console.error("Availability check failed", error)
        setStatus("error")
        setErrorMessage(error.body?.detail || "Error checking availability")
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setStatus("idle")
    setErrorMessage(null)
  }, [])

  return { status, checkAvailability, reset, errorMessage }
}
