import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Swords } from "lucide-react"
import { useState } from "react"

import {
  GlobalClubsService,
  LeaguesService,
  MatchesService,
  SeasonsService,
  UsersService,
} from "@/client"
import type { MatchWithContext } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const Route = createFileRoute("/_layout/matches")({
  component: MatchesPage,
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
    meta: [{ title: "Matches - XBHL" }],
  }),
})

const PAGE_SIZE = 25

function formatTimestamp(ts: number | null | undefined): string {
  if (!ts) return "—"
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  })
}

function ScoreBadge({ match }: { match: MatchWithContext }) {
  const home = match.home_score ?? "?"
  const away = match.away_score ?? "?"
  if (match.is_home === true) {
    const won = (match.home_score ?? -1) > (match.away_score ?? -1)
    return (
      <Badge
        className={
          won
            ? "bg-green-600 text-white font-mono"
            : "bg-destructive text-white font-mono"
        }
      >
        {home} – {away}
      </Badge>
    )
  }
  if (match.is_home === false) {
    const won = (match.away_score ?? -1) > (match.home_score ?? -1)
    return (
      <Badge
        className={
          won
            ? "bg-green-600 text-white font-mono"
            : "bg-destructive text-white font-mono"
        }
      >
        {away} – {home}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="font-mono">
      {home} – {away}
    </Badge>
  )
}

function MatchesTable({
  leagueId,
  seasonId,
  clubId,
}: {
  leagueId: string
  seasonId: string
  clubId: string
}) {
  const [page, setPage] = useState(0)

  const filters = {
    leagueId: leagueId || undefined,
    seasonId: seasonId || undefined,
    clubId: clubId || undefined,
  }

  const { data, isLoading, isFetching } = useQuery({
    queryFn: () =>
      MatchesService.getAllMatches({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        ...filters,
      }),
    queryKey: ["matches", leagueId, seasonId, clubId, page],
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  })

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        Loading matches...
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Swords className="h-10 w-10 opacity-40" />
        <p className="text-sm">No matches found.</p>
        <p className="text-xs">
          Matches are fetched automatically by the scheduler.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Date (ET)
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                League
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Season
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Club EA ID
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Side
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Opponent EA ID
              </th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                Score
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">
                Match ID
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.data.map((m) => (
              <tr
                key={`${m.id}`}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimestamp(m.ea_timestamp)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {m.league_name ?? (
                    <span className="italic text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {m.season_name ?? (
                    <span className="italic text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {m.home_club_ea_id === null && m.away_club_ea_id === null ? (
                    <span className="text-muted-foreground/50">—</span>
                  ) : m.is_home === true ? (
                    m.home_club_ea_id
                  ) : m.is_home === false ? (
                    m.away_club_ea_id
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {m.is_home === true ? (
                    <Badge variant="outline" className="text-blue-500 border-blue-500 text-xs">
                      Home
                    </Badge>
                  ) : m.is_home === false ? (
                    <Badge variant="outline" className="text-orange-500 border-orange-500 text-xs">
                      Away
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground/50 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {m.opponent_ea_id ?? (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <ScoreBadge match={m} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground/60 max-w-[120px] truncate">
                  {m.ea_match_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {data.count === 0
            ? "No matches"
            : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, data.count)} of ${data.count}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page === 0 || isFetching}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs">
            Page {page + 1} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page + 1 >= totalPages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function MatchesPage() {
  const [leagueId, setLeagueId] = useState("")
  const [seasonId, setSeasonId] = useState("")
  const [clubId, setClubId] = useState("")

  const { data: leagues } = useQuery({
    queryFn: () => LeaguesService.readLeagues({ skip: 0, limit: 100 }),
    queryKey: ["leagues"],
    staleTime: 1000 * 60,
  })

  const { data: seasons } = useQuery({
    queryFn: () =>
      SeasonsService.readSeasons({ leagueId, skip: 0, limit: 100 }),
    queryKey: ["seasons", leagueId],
    staleTime: 1000 * 60,
    enabled: !!leagueId,
  })

  const { data: clubs } = useQuery({
    queryFn: () => GlobalClubsService.readAllClubs({ skip: 0, limit: 200 }),
    queryKey: ["clubs-global"],
    staleTime: 1000 * 60,
  })

  function handleLeagueChange(val: string) {
    setLeagueId(val === "__all__" ? "" : val)
    setSeasonId("")
  }

  function handleSeasonChange(val: string) {
    setSeasonId(val === "__all__" ? "" : val)
  }

  function handleClubChange(val: string) {
    setClubId(val === "__all__" ? "" : val)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Matches</h1>
        <p className="text-muted-foreground">
          All EA match records fetched by the scheduler
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select
          value={leagueId || "__all__"}
          onValueChange={handleLeagueChange}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Leagues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Leagues</SelectItem>
            {leagues?.data.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={seasonId || "__all__"}
          onValueChange={handleSeasonChange}
          disabled={!leagueId}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Seasons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Seasons</SelectItem>
            {seasons?.data.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={clubId || "__all__"}
          onValueChange={handleClubChange}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Clubs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Clubs</SelectItem>
            {clubs?.data.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(leagueId || seasonId || clubId) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLeagueId("")
              setSeasonId("")
              setClubId("")
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <MatchesTable leagueId={leagueId} seasonId={seasonId} clubId={clubId} />
    </div>
  )
}
