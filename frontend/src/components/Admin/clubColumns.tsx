import type { ColumnDef } from "@tanstack/react-table"

import type { ClubPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { ClubActionsMenu } from "./ClubActionsMenu"

export function makeClubColumns(
  leagueId: string,
  seasonId: string,
): ColumnDef<ClubPublic>[] {
  return [
    {
      id: "logo",
      header: () => <span className="sr-only">Logo</span>,
      cell: ({ row }) => {
        const logo = row.original.logo_url
        return logo ? (
          <img
            src={logo}
            alt={row.original.name}
            className="h-8 w-8 rounded object-contain"
          />
        ) : (
          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
            ?
          </div>
        )
      },
    },
    {
      accessorKey: "name",
      header: "Club Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "ea_id",
      header: "EA ID",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground font-mono">
          {row.original.ea_id ?? <span className="italic">—</span>}
        </span>
      ),
    },
    {
      accessorKey: "season_count",
      header: "Seasons",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.season_count}</Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ClubActionsMenu
            club={row.original}
            leagueId={leagueId}
            seasonId={seasonId}
          />
        </div>
      ),
    },
  ]
}
