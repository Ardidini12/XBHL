import type { ColumnDef } from "@tanstack/react-table"

import type { LeaguePublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { LeagueActionsMenu } from "./LeagueActionsMenu"

export const leagueColumns: ColumnDef<LeaguePublic>[] = [
 {
  accessorKey: "name",
  header: "Name",
  cell: ({ row }) => (
   <span className="font-medium">{row.original.name}</span>
  ),
 },
 {
  accessorKey: "league_type",
  header: "Type",
  cell: ({ row }) => (
   <Badge variant="outline">{row.original.league_type}</Badge>
  ),
 },
 {
  accessorKey: "description",
  header: "Description",
  cell: ({ row }) => {
   const desc = row.original.description
   return (
    <span className={cn(!desc && "text-muted-foreground")}>
     {desc || "No description"}
    </span>
   )
  },
 },
 {
  accessorKey: "is_active",
  header: "Status",
  cell: ({ row }) => (
   <div className="flex items-center gap-2">
    <span
     className={cn(
      "size-2 rounded-full",
      row.original.is_active ? "bg-green-500" : "bg-gray-400",
     )}
    />
    <span className={row.original.is_active ? "" : "text-muted-foreground"}>
     {row.original.is_active ? "Active" : "Inactive"}
    </span>
   </div>
  ),
 },
 {
  id: "actions",
  header: () => <span className="sr-only">Actions</span>,
  cell: ({ row }) => (
   <div className="flex justify-end">
    <LeagueActionsMenu league={row.original} />
   </div>
  ),
 },
]
