import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { ArrowLeft, UserRound } from "lucide-react"

import { PlayersService, UsersService } from "@/client"
import type { PlayerMatchStatsPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_layout/players/$eaPlayerId")({
  component: PlayerDetailPage,
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
    meta: [{ title: "Player Detail - XBHL" }],
  }),
})

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

function fmt(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined) return "—"
  return decimals > 0 ? v.toFixed(decimals) : String(v)
}

function fmtStr(v: string | null | undefined): string {
  return v ?? "—"
}

// Column groups ordered exactly like the CSV
const STAT_COLUMNS: {
  header: string
  group?: string
  render: (s: PlayerMatchStatsPublic) => string
}[] = [
  // Identity / match context
  { header: "Position", group: "Overview", render: (s) => fmtStr(s.position) },
  { header: "Score", group: "Overview", render: (s) => fmt(s.score) },
  { header: "DNF", group: "Overview", render: (s) => fmt(s.player_dnf) },
  { header: "Level", group: "Overview", render: (s) => fmt(s.player_level) },
  { header: "Guest", group: "Overview", render: (s) => fmt(s.is_guest) },
  { header: "Platform", group: "Overview", render: (s) => fmtStr(s.client_platform) },
  { header: "Rtg Def", group: "Overview", render: (s) => fmt(s.rating_defense, 1) },
  { header: "Rtg Off", group: "Overview", render: (s) => fmt(s.rating_offense, 1) },
  { header: "Rtg Team", group: "Overview", render: (s) => fmt(s.rating_teamplay, 1) },
  // Shooting
  { header: "G", group: "Shooting", render: (s) => fmt(s.skgoals) },
  { header: "S", group: "Shooting", render: (s) => fmt(s.skshots) },
  { header: "SA", group: "Shooting", render: (s) => fmt(s.skshotattempts) },
  { header: "S%", group: "Shooting", render: (s) => fmt(s.skshotpct, 2) },
  { header: "SoN%", group: "Shooting", render: (s) => fmt(s.skshotonnetpct, 2) },
  { header: "GWG", group: "Shooting", render: (s) => fmt(s.skgwg) },
  { header: "PPG", group: "Shooting", render: (s) => fmt(s.skppg) },
  { header: "SHG", group: "Shooting", render: (s) => fmt(s.skshg) },
  { header: "Defl", group: "Shooting", render: (s) => fmt(s.skdeflections) },
  // Passing
  { header: "A", group: "Passing", render: (s) => fmt(s.skassists) },
  { header: "P", group: "Passing", render: (s) => fmt(s.skpasses) },
  { header: "PA", group: "Passing", render: (s) => fmt(s.skpassattempts) },
  { header: "P%", group: "Passing", render: (s) => fmt(s.skpasspct, 2) },
  { header: "Sauce", group: "Passing", render: (s) => fmt(s.sksaucerpasses) },
  // Puck Control
  { header: "Poss", group: "Puck Control", render: (s) => fmt(s.skpossession) },
  { header: "GA", group: "Puck Control", render: (s) => fmt(s.skgiveaways) },
  { header: "TA", group: "Puck Control", render: (s) => fmt(s.sktakeaways) },
  { header: "PKClr", group: "Puck Control", render: (s) => fmt(s.skpkclearzone) },
  // Defense
  { header: "Hits", group: "Defense", render: (s) => fmt(s.skhits) },
  { header: "Int", group: "Defense", render: (s) => fmt(s.skinterceptions) },
  { header: "Blk", group: "Defense", render: (s) => fmt(s.skbs) },
  { header: "+/-", group: "Defense", render: (s) => fmt(s.skplusmin) },
  { header: "PIM", group: "Defense", render: (s) => fmt(s.skpim) },
  { header: "PenDr", group: "Defense", render: (s) => fmt(s.skpenaltiesdrawn) },
  // Faceoffs
  { header: "FOW", group: "Faceoffs", render: (s) => fmt(s.skfow) },
  { header: "FOL", group: "Faceoffs", render: (s) => fmt(s.skfol) },
  { header: "FO%", group: "Faceoffs", render: (s) => fmt(s.skfopct, 2) },
  // Time
  { header: "TOI", group: "TOI", render: (s) => fmt(s.toi) },
  { header: "TOI(s)", group: "TOI", render: (s) => fmt(s.toiseconds) },
  // Goalie
  { header: "Saves", group: "Goalie", render: (s) => fmt(s.glsaves) },
  { header: "GA (GL)", group: "Goalie", render: (s) => fmt(s.glga) },
  { header: "Shots (GL)", group: "Goalie", render: (s) => fmt(s.glshots) },
  { header: "Sv%", group: "Goalie", render: (s) => fmt(s.glsavepct, 2) },
  { header: "GAA", group: "Goalie", render: (s) => fmt(s.glgaa, 2) },
  { header: "SO Per", group: "Goalie", render: (s) => fmt(s.glsoperiods) },
  { header: "DS", group: "Goalie", render: (s) => fmt(s.gldsaves) },
  { header: "BrkSv", group: "Goalie", render: (s) => fmt(s.glbrksaves) },
  { header: "BrkSh", group: "Goalie", render: (s) => fmt(s.glbrkshots) },
  { header: "BrkSv%", group: "Goalie", render: (s) => fmt(s.glbrksavepct, 2) },
  { header: "PkSv", group: "Goalie", render: (s) => fmt(s.glpensaves) },
  { header: "PkSh", group: "Goalie", render: (s) => fmt(s.glpenshots) },
  { header: "PkSv%", group: "Goalie", render: (s) => fmt(s.glpensavepct, 2) },
  { header: "Poke", group: "Goalie", render: (s) => fmt(s.glpokechecks) },
  { header: "PKClr (GL)", group: "Goalie", render: (s) => fmt(s.glpkclearzone) },
  // Meta
  { header: "Opp Club ID", group: "Meta", render: (s) => fmtStr(s.opponent_club_id) },
  { header: "Opp Score", group: "Meta", render: (s) => fmt(s.opponent_score) },
  { header: "Opp Team ID", group: "Meta", render: (s) => fmtStr(s.opponent_team_id) },
  { header: "Team ID", group: "Meta", render: (s) => fmtStr(s.team_id) },
  { header: "Side", group: "Meta", render: (s) => fmt(s.team_side) },
  { header: "GameType", group: "Meta", render: (s) => fmtStr(s.p_nhl_online_game_type) },
  { header: "Class", group: "Meta", render: (s) => fmt(s.stat_class) },
  { header: "PosSorted", group: "Meta", render: (s) => fmt(s.pos_sorted) },
]

const GROUP_COLORS: Record<string, string> = {
  Overview: "text-blue-400",
  Shooting: "text-orange-400",
  Passing: "text-green-400",
  "Puck Control": "text-yellow-400",
  Defense: "text-red-400",
  Faceoffs: "text-purple-400",
  TOI: "text-cyan-400",
  Goalie: "text-pink-400",
  Meta: "text-muted-foreground",
}

function PlayerDetailPage() {
  const { eaPlayerId } = Route.useParams()

  const { data, isLoading, isError } = useQuery({
    queryFn: () => PlayersService.getPlayer({ eaPlayerId }),
    queryKey: ["player", eaPlayerId],
    staleTime: 1000 * 30,
  })

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-8 text-center">Loading player...</div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-4 py-8 items-center text-muted-foreground">
        <UserRound className="h-10 w-10 opacity-40" />
        <p>Player not found.</p>
        <Link to="/players">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Players
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/players">
          <Button variant="ghost" size="icon" className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <UserRound className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">{data.gamertag}</h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="font-mono text-xs">
              EA ID: {data.ea_player_id}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {data.stats.length} match{data.stats.length !== 1 ? "es" : ""} on record
            </span>
          </div>
        </div>
      </div>

      {data.stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <p className="text-sm">No match stats recorded yet.</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs whitespace-nowrap">
              <thead className="bg-muted/50">
                <tr>
                  {/* Sticky columns */}
                  <th className="sticky left-0 z-10 bg-muted/90 text-left px-4 py-3 font-medium text-muted-foreground min-w-[160px]">
                    Date (ET)
                  </th>
                  <th className="sticky left-[160px] z-10 bg-muted/90 text-left px-4 py-3 font-medium text-muted-foreground min-w-[130px]">
                    Match ID
                  </th>
                  {/* Stat columns with group color */}
                  {STAT_COLUMNS.map((col) => (
                    <th
                      key={col.header}
                      className={`text-center px-3 py-3 font-medium ${col.group ? GROUP_COLORS[col.group] ?? "text-muted-foreground" : "text-muted-foreground"}`}
                      title={col.group}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.stats.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="sticky left-0 z-10 bg-background px-4 py-2 text-muted-foreground min-w-[160px]">
                      {formatTimestamp(s.ea_timestamp)}
                    </td>
                    <td className="sticky left-[160px] z-10 bg-background px-4 py-2 font-mono text-muted-foreground/60 min-w-[130px] max-w-[130px] truncate">
                      {s.ea_match_id}
                    </td>
                    {STAT_COLUMNS.map((col) => (
                      <td key={col.header} className="text-center px-3 py-2">
                        {col.render(s)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
