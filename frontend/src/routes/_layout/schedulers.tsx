import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { CalendarClock } from "lucide-react"

import { SchedulersService, UsersService } from "@/client"
import type { SchedulerConfigWithStatus } from "@/client"
import { Badge } from "@/components/ui/badge"

/**
 * Create query options for retrieving the list of schedulers.
 *
 * @returns An options object with `queryFn` that calls `SchedulersService.listAllSchedulers()`, `queryKey` set to `["schedulers"]`, and `staleTime` set to 30000 (30 seconds)
 */
function getSchedulersQueryOptions() {
  return {
    queryFn: () => SchedulersService.listAllSchedulers(),
    queryKey: ["schedulers"],
    staleTime: 1000 * 30,
  }
}

export const Route = createFileRoute("/_layout/schedulers")({
  component: SchedulersPage,
  beforeLoad: async () => {
    try {
      const user = await UsersService.readUserMe()
      if (!user.is_superuser) {
        throw redirect({ to: "/" })
      }
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e
      throw redirect({ to: "/" })
    }
  },
  head: () => ({
    meta: [{ title: "Schedulers - XBHL" }],
  }),
})

/**
 * Render a badge representing the scheduler's current status.
 *
 * @param cfg - Scheduler configuration whose `is_active` and `is_paused` flags determine the badge
 * @returns A Badge element: `Stopped` when `cfg.is_active` is false, `Paused` when `cfg.is_paused` is true, otherwise `Running`
 */
function statusBadge(cfg: SchedulerConfigWithStatus) {
  if (!cfg.is_active)
    return <Badge variant="secondary">Stopped</Badge>
  if (cfg.is_paused)
    return (
      <Badge variant="outline" className="text-yellow-500 border-yellow-500">
        Paused
      </Badge>
    )
  return <Badge className="bg-green-600 text-white">Running</Badge>
}

/**
 * Format an array of weekday indices into a human-readable string.
 *
 * @param days - Array of weekday indices where `0` = Monday and `6` = Sunday; may be `null` or empty.
 * @returns `—` if `days` is empty or falsy, `Every day` if it contains all seven days, otherwise a comma-separated list of three-letter day abbreviations (e.g., `Mon, Wed, Fri`).
 */
function formatDays(days: number[]): string {
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  if (!days || days.length === 0) return "—"
  if (days.length === 7) return "Every day"
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => names[d])
    .join(", ")
}

/**
 * Format a timestamp into a human-readable date/time string in the America/New_York timezone.
 *
 * @param ts - An ISO timestamp string (or null/undefined to indicate no timestamp)
 * @returns A string with short month, day, hour, minute and short timezone name (en-US, America/New_York), or "—" if `ts` is null or undefined
 */
function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return "—"
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  })
}

/**
 * Renders a table of scheduler configurations, including loading and empty states.
 *
 * Displays scheduler rows with season, league, days, UTC window, interval, status badge,
 * last run (with optional status), and total matches. If data is loading shows a
 * centered loading message; if no schedulers are present shows an empty-state hint.
 *
 * @returns The table element showing scheduler data, or a loading/empty placeholder element.
 */
function SchedulersTable() {
  const { data, isLoading } = useQuery(getSchedulersQueryOptions())

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        Loading schedulers...
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <CalendarClock className="h-10 w-10 opacity-40" />
        <p className="text-sm">No schedulers configured yet.</p>
        <p className="text-xs">
          Open a season and click the settings icon to configure one.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Season
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              League
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Days
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Window (UTC)
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Interval
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Status
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Last Run
            </th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">
              Matches
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((cfg) => (
            <tr key={cfg.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium">
                {cfg.season_name ?? <span className="text-muted-foreground italic">—</span>}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {cfg.league_name ?? <span className="italic">—</span>}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDays(cfg.days_of_week)}
              </td>
              <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                {String(cfg.start_hour).padStart(2, "0")}:00 –{" "}
                {String(cfg.end_hour).padStart(2, "0")}:00
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {cfg.interval_minutes} min
              </td>
              <td className="px-4 py-3">{statusBadge(cfg)}</td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {formatTimestamp(cfg.last_run_at ?? undefined)}
                {cfg.last_run_status && (
                  <span
                    className={`ml-1 ${
                      cfg.last_run_status === "success"
                        ? "text-green-500"
                        : cfg.last_run_status === "failed"
                          ? "text-destructive"
                          : "text-yellow-500"
                    }`}
                  >
                    ({cfg.last_run_status})
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {cfg.total_matches}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Page component that renders the Schedulers header and the schedulers table.
 *
 * @returns A JSX element containing the page title, subtitle, and the <SchedulersTable /> layout.
 */
function SchedulersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Schedulers</h1>
        <p className="text-muted-foreground">
          Overview of all active EA data fetch schedulers
        </p>
      </div>
      <SchedulersTable />
    </div>
  )
}
