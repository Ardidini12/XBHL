import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Search, UserRound } from "lucide-react"
import { useState } from "react"

import { PlayersService, UsersService } from "@/client"
import type { PlayerPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export const Route = createFileRoute("/_layout/players")({
  component: PlayersPage,
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
    meta: [{ title: "Players - XBHL" }],
  }),
})

const PAGE_SIZE = 50

function PlayersTable({
  search,
}: {
  search: string
}) {
  const [page, setPage] = useState(0)
  const navigate = useNavigate()

  const { data, isLoading, isFetching } = useQuery({
    queryFn: () =>
      PlayersService.listPlayers({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: search || undefined,
      }),
    queryKey: ["players", search, page],
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  })

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0

  if (isLoading) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        Loading players...
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <UserRound className="h-10 w-10 opacity-40" />
        <p className="text-sm">No players found.</p>
        <p className="text-xs">
          Players are extracted automatically from fetched matches.
        </p>
      </div>
    )
  }

  function handleView(player: PlayerPublic) {
    navigate({ to: "/players/$eaPlayerId", params: { eaPlayerId: player.ea_player_id } })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Gamertag
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                EA Player ID
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                First Seen
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.data.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => handleView(p)}
              >
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-muted-foreground shrink-0" />
                    {p.gamertag}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {p.ea_player_id}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {p.created_at
                    ? new Date(p.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "America/New_York",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleView(p)
                    }}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {data.count === 0
            ? "No players"
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

function PlayersPage() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
  }

  function handleClear() {
    setSearchInput("")
    setSearch("")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Players</h1>
        <p className="text-muted-foreground">
          All players extracted from fetched match data
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 items-center max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search gamertag..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
        {search && (
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        )}
      </form>

      {search && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtering by:</span>
          <Badge variant="secondary">{search}</Badge>
        </div>
      )}

      <PlayersTable search={search} />
    </div>
  )
}
