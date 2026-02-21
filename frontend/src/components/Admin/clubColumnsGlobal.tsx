import type { ColumnDef } from "@tanstack/react-table"

import type { ClubPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { ClubActionsMenuGlobal } from "./ClubActionsMenuGlobal"

export const clubColumnsGlobal: ColumnDef<ClubPublic>[] = [
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
    id: "current_seasons",
    header: "Active Seasons",
    cell: ({ row }) => {
      const active = (row.original.history ?? []).filter((h) => h.is_active)
      if (active.length === 0) {
        return <span className="text-muted-foreground text-sm italic">None</span>
      }
      return (
        <div className="flex flex-wrap gap-1">
          {active.map((h) => (
            <Badge key={`${h.league_id}-${h.season_id}`} variant="secondary" className="text-xs">
              {h.league_name} — {h.season_name}
            </Badge>
          ))}
        </div>
      )
    },
  },
  {
    id: "season_history",
    header: "Season History",
    cell: ({ row }) => {
      const history = row.original.history ?? []
      if (history.length === 0) {
        return <span className="text-muted-foreground text-sm italic">Unassigned</span>
      }
      return (
        <div className="flex flex-col gap-1">
          {history.map((h) => (
            <div key={`${h.league_id}-${h.season_id}`} className="flex items-center gap-1.5">
              <Badge
                variant={h.is_active ? "default" : "outline"}
                className="text-xs shrink-0"
              >
                {h.is_active ? "Active" : "Ended"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {h.league_name} — {h.season_name}
              </span>
            </div>
          ))}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <ClubActionsMenuGlobal club={row.original} />
      </div>
    ),
  },
]
