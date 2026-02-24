import type { ColumnDef } from "@tanstack/react-table"

import type { SeasonPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { SeasonActionsMenu } from "./SeasonActionsMenu"

function formatDateET(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  })
}

export const seasonColumns: ColumnDef<SeasonPublic>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "start_date",
    header: "Start Date (ET)",
    cell: ({ row }) => {
      const date = row.original.start_date
      return (
        <span className="text-sm text-muted-foreground">
          {formatDateET(date)}
        </span>
      )
    },
  },
  {
    accessorKey: "end_date",
    header: "End Date (ET)",
    cell: ({ row }) => {
      const date = row.original.end_date
      return date ? (
        <span className="text-sm text-muted-foreground">
          {formatDateET(date)}
        </span>
      ) : (
        <Badge variant="outline" className="text-green-500 border-green-500">
          Active
        </Badge>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <SeasonActionsMenu season={row.original} />
      </div>
    ),
  },
]
