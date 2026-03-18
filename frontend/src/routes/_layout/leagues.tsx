import { useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router"
import { Suspense } from "react"

import { LeaguesService } from "@/client"
import { ensureSuperuser } from "@/lib/auth-guard"
import AddLeague from "@/components/Admin/AddLeague"
import { leagueColumns } from "@/components/Admin/leagueColumns"
import { DataTable } from "@/components/Common/DataTable"

function getLeaguesQueryOptions() {
  return {
    queryFn: () => LeaguesService.readLeagues({ skip: 0, limit: 100 }),
    queryKey: ["leagues"],
    staleTime: 1000 * 60,
  }
}

export const Route = createFileRoute("/_layout/leagues")({
  component: Leagues,
  beforeLoad: ensureSuperuser,
  head: () => ({
    meta: [
      {
        title: "Leagues - XBHL",
      },
    ],
  }),
})

function LeaguesTableContent() {
  const { data: leagues } = useSuspenseQuery(getLeaguesQueryOptions())
  return <DataTable columns={leagueColumns} data={leagues.data} />
}

function LeaguesTable() {
  return (
    <Suspense
      fallback={<div className="text-muted-foreground">Loading leagues...</div>}
    >
      <LeaguesTableContent />
    </Suspense>
  )
}

function Leagues() {
  const router = useRouterState()
  const pathname = router.location.pathname
  const isLeagueDetail =
    pathname.startsWith("/leagues/") && pathname !== "/leagues"

  return (
    <div className="flex flex-col gap-6">
      <div className={isLeagueDetail ? "hidden" : "flex flex-col gap-6"}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leagues</h1>
            <p className="text-muted-foreground">Manage 3v3 and 6v6 leagues</p>
          </div>
          <AddLeague />
        </div>
        <LeaguesTable />
      </div>
      <div className={isLeagueDetail ? "block" : "hidden"}>
        <Outlet />
      </div>
    </div>
  )
}
