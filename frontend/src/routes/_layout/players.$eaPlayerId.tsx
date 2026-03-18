import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, UserRound, ChevronDown, ChevronRight, Trophy, Shield, Star } from "lucide-react"

import { PlayersService } from "@/client"
import { ensureSuperuser } from "@/lib/auth-guard"
import type { PlayerMatchStatsPublic, PlayerStatTotals, PlayerSeasonGroup, PlayerLeagueGroup } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const Route = createFileRoute("/_layout/players/$eaPlayerId")({
  component: PlayerDetailPage,
  beforeLoad: ensureSuperuser,
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

function formatTOI(seconds: number): string {
  if (!seconds) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

const STAT_COLUMNS: {
  header: string
  group?: string
  render: (s: PlayerMatchStatsPublic) => string
}[] = [
  { header: "Position", group: "Overview", render: (s) => fmtStr(s.position) },
  { header: "Score", group: "Overview", render: (s) => fmt(s.score) },
  { header: "DNF", group: "Overview", render: (s) => fmt(s.player_dnf) },
  { header: "Level", group: "Overview", render: (s) => fmt(s.player_level) },
  { header: "Guest", group: "Overview", render: (s) => fmt(s.is_guest) },
  { header: "Platform", group: "Overview", render: (s) => fmtStr(s.client_platform) },
  { header: "Rtg Def", group: "Overview", render: (s) => fmt(s.rating_defense, 1) },
  { header: "Rtg Off", group: "Overview", render: (s) => fmt(s.rating_offense, 1) },
  { header: "Rtg Team", group: "Overview", render: (s) => fmt(s.rating_teamplay, 1) },
  { header: "G", group: "Shooting", render: (s) => fmt(s.skgoals) },
  { header: "S", group: "Shooting", render: (s) => fmt(s.skshots) },
  { header: "SA", group: "Shooting", render: (s) => fmt(s.skshotattempts) },
  { header: "S%", group: "Shooting", render: (s) => fmt(s.skshotpct, 2) },
  { header: "SoN%", group: "Shooting", render: (s) => fmt(s.skshotonnetpct, 2) },
  { header: "GWG", group: "Shooting", render: (s) => fmt(s.skgwg) },
  { header: "PPG", group: "Shooting", render: (s) => fmt(s.skppg) },
  { header: "SHG", group: "Shooting", render: (s) => fmt(s.skshg) },
  { header: "Defl", group: "Shooting", render: (s) => fmt(s.skdeflections) },
  { header: "A", group: "Passing", render: (s) => fmt(s.skassists) },
  { header: "P", group: "Passing", render: (s) => fmt(s.skpasses) },
  { header: "PA", group: "Passing", render: (s) => fmt(s.skpassattempts) },
  { header: "P%", group: "Passing", render: (s) => fmt(s.skpasspct, 2) },
  { header: "Sauce", group: "Passing", render: (s) => fmt(s.sksaucerpasses) },
  { header: "Poss", group: "Puck Control", render: (s) => fmt(s.skpossession) },
  { header: "GA", group: "Puck Control", render: (s) => fmt(s.skgiveaways) },
  { header: "TA", group: "Puck Control", render: (s) => fmt(s.sktakeaways) },
  { header: "PKClr", group: "Puck Control", render: (s) => fmt(s.skpkclearzone) },
  { header: "Hits", group: "Defense", render: (s) => fmt(s.skhits) },
  { header: "Int", group: "Defense", render: (s) => fmt(s.skinterceptions) },
  { header: "Blk", group: "Defense", render: (s) => fmt(s.skbs) },
  { header: "+/-", group: "Defense", render: (s) => fmt(s.skplusmin) },
  { header: "PIM", group: "Defense", render: (s) => fmt(s.skpim) },
  { header: "PenDr", group: "Defense", render: (s) => fmt(s.skpenaltiesdrawn) },
  { header: "FOW", group: "Faceoffs", render: (s) => fmt(s.skfow) },
  { header: "FOL", group: "Faceoffs", render: (s) => fmt(s.skfol) },
  { header: "FO%", group: "Faceoffs", render: (s) => fmt(s.skfopct, 2) },
  { header: "TOI", group: "TOI", render: (s) => fmt(s.toi) },
  { header: "TOI(s)", group: "TOI", render: (s) => fmt(s.toiseconds) },
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
  { header: "Opp Club ID", group: "Meta", render: (s) => fmtStr(s.opponent_club_id) },
  { header: "Opp Score", group: "Meta", render: (s) => fmt(s.opponent_score) },
  { header: "Opp Team ID", group: "Meta", render: (s) => fmtStr(s.opponent_team_id) },
  { header: "Team ID", group: "Meta", render: (s) => fmtStr(s.team_id) },
  { header: "Side", group: "Meta", render: (s) => fmt(s.team_side) },
  { header: "GameType", group: "Meta", render: (s) => fmtStr(s.p_nhl_online_game_type) },
  { header: "Class", group: "Meta", render: (s) => fmt(s.stat_class) },
  { header: "PosSorted", group: "Meta", render: (s) => fmt(s.pos_sorted) },
]

const TOTALS_COLUMNS: {
  header: string
  group?: string
  render: (t: PlayerStatTotals) => string
}[] = [
  { header: "Position", group: "Overview", render: () => "—" },
  { header: "Score", group: "Overview", render: () => "—" },
  { header: "DNF", group: "Overview", render: () => "—" },
  { header: "Level", group: "Overview", render: () => "—" },
  { header: "Guest", group: "Overview", render: () => "—" },
  { header: "Platform", group: "Overview", render: () => "—" },
  { header: "Rtg Def", group: "Overview", render: () => "—" },
  { header: "Rtg Off", group: "Overview", render: () => "—" },
  { header: "Rtg Team", group: "Overview", render: () => "—" },
  { header: "G", group: "Shooting", render: (t) => String(t.goals) },
  { header: "S", group: "Shooting", render: (t) => String(t.shots) },
  { header: "SA", group: "Shooting", render: (t) => String(t.shot_attempts) },
  { header: "S%", group: "Shooting", render: (t) => t.shot_pct.toFixed(2) },
  { header: "SoN%", group: "Shooting", render: () => "—" },
  { header: "GWG", group: "Shooting", render: (t) => String(t.gwg) },
  { header: "PPG", group: "Shooting", render: (t) => String(t.ppg) },
  { header: "SHG", group: "Shooting", render: (t) => String(t.shg) },
  { header: "Defl", group: "Shooting", render: (t) => String(t.deflections) },
  { header: "A", group: "Passing", render: (t) => String(t.assists) },
  { header: "P", group: "Passing", render: (t) => String(t.passes_completed) },
  { header: "PA", group: "Passing", render: (t) => String(t.pass_attempts) },
  { header: "P%", group: "Passing", render: (t) => t.pass_pct.toFixed(2) },
  { header: "Sauce", group: "Passing", render: (t) => String(t.saucer_passes) },
  { header: "Poss", group: "Puck Control", render: (t) => String(t.possession) },
  { header: "GA", group: "Puck Control", render: (t) => String(t.giveaways) },
  { header: "TA", group: "Puck Control", render: (t) => String(t.takeaways) },
  { header: "PKClr", group: "Puck Control", render: (t) => String(t.pk_clear_zone) },
  { header: "Hits", group: "Defense", render: (t) => String(t.hits) },
  { header: "Int", group: "Defense", render: (t) => String(t.interceptions) },
  { header: "Blk", group: "Defense", render: (t) => String(t.blocked_shots) },
  { header: "+/-", group: "Defense", render: (t) => String(t.plus_minus) },
  { header: "PIM", group: "Defense", render: (t) => String(t.pim) },
  { header: "PenDr", group: "Defense", render: (t) => String(t.penalties_drawn) },
  { header: "FOW", group: "Faceoffs", render: (t) => String(t.faceoff_wins) },
  { header: "FOL", group: "Faceoffs", render: (t) => String(t.faceoff_losses) },
  { header: "FO%", group: "Faceoffs", render: (t) => t.faceoff_pct.toFixed(2) },
  { header: "TOI", group: "TOI", render: (t) => formatTOI(t.toi_seconds) },
  { header: "TOI(s)", group: "TOI", render: (t) => String(t.toi_seconds) },
  { header: "Saves", group: "Goalie", render: (t) => String(t.gl_saves) },
  { header: "GA (GL)", group: "Goalie", render: (t) => String(t.gl_ga) },
  { header: "Shots (GL)", group: "Goalie", render: (t) => String(t.gl_shots) },
  { header: "Sv%", group: "Goalie", render: (t) => t.gl_save_pct.toFixed(2) },
  { header: "GAA", group: "Goalie", render: () => "—" },
  { header: "SO Per", group: "Goalie", render: (t) => String(t.gl_so_periods) },
  { header: "DS", group: "Goalie", render: (t) => String(t.gl_dsaves) },
  { header: "BrkSv", group: "Goalie", render: (t) => String(t.gl_brk_saves) },
  { header: "BrkSh", group: "Goalie", render: (t) => String(t.gl_brk_shots) },
  { header: "BrkSv%", group: "Goalie", render: () => "—" },
  { header: "PkSv", group: "Goalie", render: (t) => String(t.gl_pen_saves) },
  { header: "PkSh", group: "Goalie", render: (t) => String(t.gl_pen_shots) },
  { header: "PkSv%", group: "Goalie", render: () => "—" },
  { header: "Poke", group: "Goalie", render: (t) => String(t.gl_poke_checks) },
  { header: "PKClr (GL)", group: "Goalie", render: (t) => String(t.gl_pk_clear_zone) },
  { header: "Opp Club ID", group: "Meta", render: () => "—" },
  { header: "Opp Score", group: "Meta", render: () => "—" },
  { header: "Opp Team ID", group: "Meta", render: () => "—" },
  { header: "Team ID", group: "Meta", render: () => "—" },
  { header: "Side", group: "Meta", render: () => "—" },
  { header: "GameType", group: "Meta", render: () => "—" },
  { header: "Class", group: "Meta", render: () => "—" },
  { header: "PosSorted", group: "Meta", render: () => "—" },
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

const COL_COUNT = STAT_COLUMNS.length + 2

function TotalsRow({ totals, label }: { totals: PlayerStatTotals; label: string }) {
  return (
    <tr className="bg-muted/60 font-semibold border-t-2 border-primary/30">
      <td className="sticky left-0 z-10 bg-muted/80 px-4 py-2.5 text-primary min-w-[160px]">
        {label}
      </td>
      <td className="sticky left-[160px] z-10 bg-muted/80 px-4 py-2.5 font-mono text-muted-foreground min-w-[130px]">
        {totals.games_played} GP
      </td>
      {TOTALS_COLUMNS.map((col) => (
        <td key={col.header} className="text-center px-3 py-2.5">
          {col.render(totals)}
        </td>
      ))}
    </tr>
  )
}

function MatchRows({ stats }: { stats: PlayerMatchStatsPublic[] }) {
  return (
    <>
      {stats.map((s) => (
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
    </>
  )
}

function SectionHeader({
  label,
  matchCount,
  isOpen,
  onToggle,
  depth = 0,
}: {
  label: string
  matchCount: number
  isOpen: boolean
  onToggle: () => void
  depth?: number
}) {
  const bg = depth === 0 ? "bg-primary/10" : "bg-muted/40"
  const Icon = isOpen ? ChevronDown : ChevronRight
  return (
    <tr
      className={`${bg} cursor-pointer select-none hover:bg-primary/20 transition-colors`}
      onClick={onToggle}
    >
      <td colSpan={COL_COUNT} className="px-4 py-2.5">
        <div className="flex items-center gap-2" style={{ paddingLeft: depth * 16 }}>
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-sm">{label}</span>
          <Badge variant="outline" className="text-xs ml-1">
            {matchCount} match{matchCount !== 1 ? "es" : ""}
          </Badge>
        </div>
      </td>
    </tr>
  )
}

function TableHeader() {
  return (
    <thead className="bg-muted/50">
      <tr>
        <th className="sticky left-0 z-10 bg-muted/90 text-left px-4 py-3 font-medium text-muted-foreground min-w-[160px]">
          Date (ET)
        </th>
        <th className="sticky left-[160px] z-10 bg-muted/90 text-left px-4 py-3 font-medium text-muted-foreground min-w-[130px]">
          Match ID
        </th>
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
  )
}

function SeasonView({ seasonGroup }: { seasonGroup: PlayerSeasonGroup }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-xs whitespace-nowrap w-full">
          <TableHeader />
          <tbody className="divide-y divide-border">
            <MatchRows stats={seasonGroup.stats} />
            <TotalsRow totals={seasonGroup.totals} label={`Total — ${seasonGroup.season_name}`} />
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LeagueView({ leagueGroup }: { leagueGroup: PlayerLeagueGroup }) {
  const [openSeasons, setOpenSeasons] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const sg of leagueGroup.seasons) init[sg.season_id] = true
    return init
  })

  const toggle = (sid: string) =>
    setOpenSeasons((prev) => ({ ...prev, [sid]: !prev[sid] }))

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-xs whitespace-nowrap w-full">
          <TableHeader />
          <tbody className="divide-y divide-border">
            {leagueGroup.seasons.map((sg) => (
              <SeasonSection
                key={sg.season_id}
                seasonGroup={sg}
                isOpen={openSeasons[sg.season_id] ?? true}
                onToggle={() => toggle(sg.season_id)}
                depth={0}
              />
            ))}
            <TotalsRow totals={leagueGroup.totals} label={`Total — ${leagueGroup.league_name}`} />
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SeasonSection({
  seasonGroup,
  isOpen,
  onToggle,
  depth,
}: {
  seasonGroup: PlayerSeasonGroup
  isOpen: boolean
  onToggle: () => void
  depth: number
}) {
  return (
    <>
      <SectionHeader
        label={seasonGroup.season_name}
        matchCount={seasonGroup.stats.length}
        isOpen={isOpen}
        onToggle={onToggle}
        depth={depth}
      />
      {isOpen && (
        <>
          <MatchRows stats={seasonGroup.stats} />
          <TotalsRow totals={seasonGroup.totals} label={`Subtotal — ${seasonGroup.season_name}`} />
        </>
      )}
    </>
  )
}

function CareerView({ leagues }: { leagues: PlayerLeagueGroup[]; careerTotals: PlayerStatTotals }) {
  const [openLeagues, setOpenLeagues] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const lg of leagues) init[lg.league_id] = true
    return init
  })
  const [openSeasons, setOpenSeasons] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const lg of leagues)
      for (const sg of lg.seasons)
        init[sg.season_id] = true
    return init
  })

  const toggleLeague = (lid: string) =>
    setOpenLeagues((prev) => ({ ...prev, [lid]: !prev[lid] }))
  const toggleSeason = (sid: string) =>
    setOpenSeasons((prev) => ({ ...prev, [sid]: !prev[sid] }))

  const totalMatches = leagues.reduce(
    (acc, lg) => acc + lg.seasons.reduce((a2, sg) => a2 + sg.stats.length, 0),
    0,
  )

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-xs whitespace-nowrap w-full">
          <TableHeader />
          <tbody className="divide-y divide-border">
            {leagues.map((lg) => {
              const lgMatchCount = lg.seasons.reduce((a, sg) => a + sg.stats.length, 0)
              const lgOpen = openLeagues[lg.league_id] ?? true
              return (
                <LeagueSection
                  key={lg.league_id}
                  leagueGroup={lg}
                  lgMatchCount={lgMatchCount}
                  lgOpen={lgOpen}
                  onToggleLeague={() => toggleLeague(lg.league_id)}
                  openSeasons={openSeasons}
                  onToggleSeason={toggleSeason}
                />
              )
            })}
            {totalMatches > 0 && (
              <TotalsRow
                totals={leagues.length === 1 ? leagues[0].totals : leagues.reduce(
                  (acc, lg) => mergeTotals(acc, lg.totals),
                  emptyTotals(),
                )}
                label="Career Total"
              />
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LeagueSection({
  leagueGroup,
  lgMatchCount,
  lgOpen,
  onToggleLeague,
  openSeasons,
  onToggleSeason,
}: {
  leagueGroup: PlayerLeagueGroup
  lgMatchCount: number
  lgOpen: boolean
  onToggleLeague: () => void
  openSeasons: Record<string, boolean>
  onToggleSeason: (sid: string) => void
}) {
  return (
    <>
      <SectionHeader
        label={leagueGroup.league_name}
        matchCount={lgMatchCount}
        isOpen={lgOpen}
        onToggle={onToggleLeague}
        depth={0}
      />
      {lgOpen && (
        <>
          {leagueGroup.seasons.map((sg) => (
            <SeasonSection
              key={sg.season_id}
              seasonGroup={sg}
              isOpen={openSeasons[sg.season_id] ?? true}
              onToggle={() => onToggleSeason(sg.season_id)}
              depth={1}
            />
          ))}
          <TotalsRow totals={leagueGroup.totals} label={`Total — ${leagueGroup.league_name}`} />
        </>
      )}
    </>
  )
}

function emptyTotals(): PlayerStatTotals {
  return {
    games_played: 0, goals: 0, assists: 0, points: 0, plus_minus: 0,
    hits: 0, shots: 0, shot_pct: 0, pim: 0, takeaways: 0, giveaways: 0,
    faceoff_wins: 0, faceoff_losses: 0, faceoff_pct: 0, toi_seconds: 0,
    blocked_shots: 0, interceptions: 0, pass_attempts: 0, passes_completed: 0,
    pass_pct: 0, gwg: 0, ppg: 0, shg: 0, deflections: 0, shot_attempts: 0,
    saucer_passes: 0, penalties_drawn: 0, pk_clear_zone: 0, possession: 0,
    gl_saves: 0, gl_ga: 0, gl_shots: 0, gl_save_pct: 0, gl_so_periods: 0,
    gl_brk_saves: 0, gl_brk_shots: 0, gl_pen_saves: 0, gl_pen_shots: 0,
    gl_poke_checks: 0, gl_pk_clear_zone: 0, gl_dsaves: 0,
  }
}

function mergeTotals(a: PlayerStatTotals, b: PlayerStatTotals): PlayerStatTotals {
  const gp = a.games_played + b.games_played
  const goals = a.goals + b.goals
  const shots = a.shots + b.shots
  const fow = a.faceoff_wins + b.faceoff_wins
  const fol = a.faceoff_losses + b.faceoff_losses
  const pa = a.pass_attempts + b.pass_attempts
  const pc = a.passes_completed + b.passes_completed
  const glSv = a.gl_saves + b.gl_saves
  const glSh = a.gl_shots + b.gl_shots
  return {
    games_played: gp,
    goals, assists: a.assists + b.assists,
    points: goals + a.assists + b.assists,
    plus_minus: a.plus_minus + b.plus_minus,
    hits: a.hits + b.hits, shots,
    shot_pct: shots ? +((goals / shots * 100).toFixed(2)) : 0,
    pim: a.pim + b.pim,
    takeaways: a.takeaways + b.takeaways,
    giveaways: a.giveaways + b.giveaways,
    faceoff_wins: fow, faceoff_losses: fol,
    faceoff_pct: (fow + fol) ? +(((fow / (fow + fol)) * 100).toFixed(2)) : 0,
    toi_seconds: a.toi_seconds + b.toi_seconds,
    blocked_shots: a.blocked_shots + b.blocked_shots,
    interceptions: a.interceptions + b.interceptions,
    pass_attempts: pa, passes_completed: pc,
    pass_pct: pa ? +((pc / pa * 100).toFixed(2)) : 0,
    gwg: a.gwg + b.gwg, ppg: a.ppg + b.ppg, shg: a.shg + b.shg,
    deflections: a.deflections + b.deflections,
    shot_attempts: a.shot_attempts + b.shot_attempts,
    saucer_passes: a.saucer_passes + b.saucer_passes,
    penalties_drawn: a.penalties_drawn + b.penalties_drawn,
    pk_clear_zone: a.pk_clear_zone + b.pk_clear_zone,
    possession: a.possession + b.possession,
    gl_saves: glSv, gl_ga: a.gl_ga + b.gl_ga, gl_shots: glSh,
    gl_save_pct: glSh ? +((glSv / glSh * 100).toFixed(2)) : 0,
    gl_so_periods: a.gl_so_periods + b.gl_so_periods,
    gl_brk_saves: a.gl_brk_saves + b.gl_brk_saves,
    gl_brk_shots: a.gl_brk_shots + b.gl_brk_shots,
    gl_pen_saves: a.gl_pen_saves + b.gl_pen_saves,
    gl_pen_shots: a.gl_pen_shots + b.gl_pen_shots,
    gl_poke_checks: a.gl_poke_checks + b.gl_poke_checks,
    gl_pk_clear_zone: a.gl_pk_clear_zone + b.gl_pk_clear_zone,
    gl_dsaves: a.gl_dsaves + b.gl_dsaves,
  }
}

function PlayerDetailPage() {
  const { eaPlayerId } = Route.useParams()
  const [mode, setMode] = useState<"career" | "league" | "season">("career")
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryFn: () => PlayersService.getPlayer({ eaPlayerId }),
    queryKey: ["player", eaPlayerId],
    staleTime: 1000 * 30,
  })

  const totalMatches = useMemo(() => {
    if (!data) return 0
    return data.leagues.reduce(
      (acc, lg) => acc + lg.seasons.reduce((a2, sg) => a2 + sg.stats.length, 0),
      0,
    )
  }, [data])

  const selectedLeague = useMemo(() => {
    if (!data || !selectedLeagueId) return null
    return data.leagues.find((lg) => lg.league_id === selectedLeagueId) ?? null
  }, [data, selectedLeagueId])

  const selectedSeason = useMemo(() => {
    if (!data || !selectedSeasonId) return null
    for (const lg of data.leagues)
      for (const sg of lg.seasons)
        if (sg.season_id === selectedSeasonId) return sg
    return null
  }, [data, selectedSeasonId])

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
              {totalMatches} match{totalMatches !== 1 ? "es" : ""} on record
            </span>
          </div>
        </div>
      </div>

      {totalMatches === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <p className="text-sm">No match stats recorded yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Mode Tabs + Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "career" | "league" | "season")}>
              <TabsList>
                <TabsTrigger value="career" className="gap-1.5">
                  <Star className="h-3.5 w-3.5" /> Career
                </TabsTrigger>
                <TabsTrigger value="league" className="gap-1.5">
                  <Trophy className="h-3.5 w-3.5" /> League
                </TabsTrigger>
                <TabsTrigger value="season" className="gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Season
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {mode === "league" && data.available_leagues.length > 0 && (
              <Select
                value={selectedLeagueId ?? ""}
                onValueChange={(v) => setSelectedLeagueId(v)}
              >
                <SelectTrigger size="sm">
                  <SelectValue placeholder="Select league..." />
                </SelectTrigger>
                <SelectContent>
                  {data.available_leagues.map((lg) => (
                    <SelectItem key={lg.id} value={lg.id}>
                      {lg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {mode === "season" && data.available_seasons.length > 0 && (
              <Select
                value={selectedSeasonId ?? ""}
                onValueChange={(v) => setSelectedSeasonId(v)}
              >
                <SelectTrigger size="sm">
                  <SelectValue placeholder="Select season..." />
                </SelectTrigger>
                <SelectContent>
                  {data.available_seasons.map((sn) => (
                    <SelectItem key={sn.id} value={sn.id}>
                      {sn.name}{sn.league_name ? ` (${sn.league_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Content based on mode */}
          {mode === "career" && (
            <CareerView leagues={data.leagues} careerTotals={data.career_totals} />
          )}

          {mode === "league" && selectedLeague && (
            <LeagueView leagueGroup={selectedLeague} />
          )}
          {mode === "league" && !selectedLeague && (
            <div className="text-muted-foreground text-sm py-8 text-center">
              Select a league from the dropdown above.
            </div>
          )}

          {mode === "season" && selectedSeason && (
            <SeasonView seasonGroup={selectedSeason} />
          )}
          {mode === "season" && !selectedSeason && (
            <div className="text-muted-foreground text-sm py-8 text-center">
              Select a season from the dropdown above.
            </div>
          )}
        </div>
      )}

      <div className="pt-2">
        <Link to="/players">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to all players
          </Button>
        </Link>
      </div>
    </div>
  )
}
