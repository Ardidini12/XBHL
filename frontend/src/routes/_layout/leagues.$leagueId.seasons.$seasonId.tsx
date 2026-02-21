import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useParams,
  useRouterState,
} from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { Suspense, useMemo } from "react"

import { ClubsService, SeasonsService, UsersService } from "@/client"
import AddClub from "@/components/Admin/AddClub"
import { makeClubColumns } from "@/components/Admin/clubColumns"
import { DataTable } from "@/components/Common/DataTable"
import { Button } from "@/components/ui/button"
import { getLeagueQueryOptions } from "./leagues.$leagueId"

function getSeasonQueryOptions(leagueId: string, seasonId: string) {
  return {
    queryFn: () => SeasonsService.getSeason({ leagueId, seasonId }),
    queryKey: ["seasons", leagueId, seasonId],
    staleTime: 1000 * 60,
  }
}

function getClubsQueryOptions(leagueId: string, seasonId: string) {
  return {
    queryFn: () =>
      ClubsService.readClubs({ leagueId, seasonId, skip: 0, limit: 100 }),
    queryKey: ["clubs", leagueId, seasonId],
    staleTime: 1000 * 60,
  }
}

export const Route = createFileRoute(
  "/_layout/leagues/$leagueId/seasons/$seasonId",
)({
  component: SeasonDetail,
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
    meta: [{ title: "Season - XBHL" }],
  }),
})

function SeasonHeader({
  leagueId,
  seasonId,
}: {
  leagueId: string
  seasonId: string
}) {
  const { data: league } = useSuspenseQuery(getLeagueQueryOptions(leagueId))
  const { data: season } = useSuspenseQuery(
    getSeasonQueryOptions(leagueId, seasonId),
  )
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{league.name}</p>
      <h1 className="text-2xl font-bold tracking-tight">{season.name}</h1>
      <p className="text-muted-foreground">Manage clubs for this season</p>
    </div>
  )
}

function ClubsTableContent({
  leagueId,
  seasonId,
}: {
  leagueId: string
  seasonId: string
}) {
  const { data: clubs } = useSuspenseQuery(
    getClubsQueryOptions(leagueId, seasonId),
  )
  const columns = useMemo(
    () => makeClubColumns(leagueId, seasonId),
    [leagueId, seasonId],
  )
  return <DataTable columns={columns} data={clubs.data} />
}

function ClubsTable({
  leagueId,
  seasonId,
}: {
  leagueId: string
  seasonId: string
}) {
  return (
    <Suspense
      fallback={<div className="text-muted-foreground">Loading clubs...</div>}
    >
      <ClubsTableContent leagueId={leagueId} seasonId={seasonId} />
    </Suspense>
  )
}

function SeasonDetail() {
  const { leagueId, seasonId } = useParams({
    from: "/_layout/leagues/$leagueId/seasons/$seasonId",
  })
  const router = useRouterState()
  const pathname = router.location.pathname
  const isDeeper = pathname.split("/").length > 6

  return (
    <div className="flex flex-col gap-6">
      <div className={isDeeper ? "hidden" : "flex flex-col gap-6"}>
        <div>
          <Button variant="ghost" asChild>
            <Link to="/leagues/$leagueId" params={{ leagueId }}>
              <ArrowLeft className="mr-2" />
              Back to seasons
            </Link>
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <Suspense
            fallback={<div className="text-muted-foreground">Loading...</div>}
          >
            <SeasonHeader leagueId={leagueId} seasonId={seasonId} />
          </Suspense>
          <AddClub leagueId={leagueId} seasonId={seasonId} />
        </div>
        <ClubsTable leagueId={leagueId} seasonId={seasonId} />
      </div>
      <div className={isDeeper ? "block" : "hidden"}>
        <Outlet />
      </div>
    </div>
  )
}
