import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect, useParams } from "@tanstack/react-router"
import { Suspense } from "react"

import { LeaguesService, SeasonsService, UsersService } from "@/client"
import AddSeason from "@/components/Admin/AddSeason"
import { seasonColumns } from "@/components/Admin/seasonColumns"
import { DataTable } from "@/components/Common/DataTable"

function getSeasonsQueryOptions(leagueId: string) {
 return {
  queryFn: () => SeasonsService.readSeasons({ leagueId, skip: 0, limit: 100 }),
  queryKey: ["seasons", leagueId],
 }
}

function getLeagueQueryOptions(leagueId: string) {
 return {
  queryFn: () => LeaguesService.readLeagueById({ leagueId }),
  queryKey: ["leagues", leagueId],
 }
}

export const Route = createFileRoute("/_layout/leagues/$leagueId")({
 component: LeagueDetail,
 beforeLoad: async () => {
  const user = await UsersService.readUserMe()
  if (!user.is_superuser) {
   throw redirect({ to: "/" })
  }
 },
 head: () => ({
  meta: [{ title: "League - XBHL" }],
 }),
})

function SeasonsTableContent({ leagueId }: { leagueId: string }) {
 const { data: seasons } = useSuspenseQuery(getSeasonsQueryOptions(leagueId))
 return <DataTable columns={seasonColumns} data={seasons.data} />
}

function SeasonsTable({ leagueId }: { leagueId: string }) {
 return (
  <Suspense fallback={<div className="text-muted-foreground">Loading seasons...</div>}>
   <SeasonsTableContent leagueId={leagueId} />
  </Suspense>
 )
}

function LeagueHeader({ leagueId }: { leagueId: string }) {
 const { data: league } = useSuspenseQuery(getLeagueQueryOptions(leagueId))
 return (
  <div>
   <h1 className="text-2xl font-bold tracking-tight">{league.name}</h1>
   <p className="text-muted-foreground">Manage seasons for this league</p>
  </div>
 )
}

function LeagueDetail() {
 const { leagueId } = useParams({ from: "/_layout/leagues/$leagueId" })

 return (
  <div className="flex flex-col gap-6">
   <div className="flex items-center justify-between">
    <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
     <LeagueHeader leagueId={leagueId} />
    </Suspense>
    <AddSeason leagueId={leagueId} />
   </div>
   <SeasonsTable leagueId={leagueId} />
  </div>
 )
}
