import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Suspense } from "react"

import { GlobalClubsService, UsersService } from "@/client"
import AddClubsGlobal from "@/components/Admin/AddClubsGlobal"
import { clubColumnsGlobal } from "@/components/Admin/clubColumnsGlobal"
import { DataTable } from "@/components/Common/DataTable"

function getGlobalClubsQueryOptions() {
  return {
    queryFn: () => GlobalClubsService.readAllClubs({ skip: 0, limit: 500 }),
    queryKey: ["clubs-global"],
    staleTime: 1000 * 60,
  }
}

export const Route = createFileRoute("/_layout/clubs")({
  component: ClubsPage,
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
    meta: [{ title: "Clubs - XBHL" }],
  }),
})

function ClubsTableContent() {
  const { data } = useSuspenseQuery(getGlobalClubsQueryOptions())
  return <DataTable columns={clubColumnsGlobal} data={data.data} />
}

function ClubsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clubs</h1>
          <p className="text-muted-foreground">
            All clubs registered on the platform across all leagues and seasons.
          </p>
        </div>
        <AddClubsGlobal />
      </div>
      <Suspense
        fallback={<div className="text-muted-foreground">Loading clubs...</div>}
      >
        <ClubsTableContent />
      </Suspense>
    </div>
  )
}
