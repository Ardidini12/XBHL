import type { ColumnDef } from "@tanstack/react-table"
import { format, parseISO } from "date-fns"

import type { SeasonPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { SeasonActionsMenu } from "./SeasonActionsMenu"

export const seasonColumns: ColumnDef<SeasonPublic>[] = [
 {
  accessorKey: "name",
  header: "Name",
  cell: ({ row }) => (
   <span className="font-medium">{row.original.name}</span>
  ),
 },
 {
  accessorKey: "start_date",
  header: "Start Date",
  cell: ({ row }) => {
   const date = row.original.start_date
   return (
    <span className="text-sm text-muted-foreground">
     {format(parseISO(date), "PPP")}
    </span>
   )
  },
 },
 {
  accessorKey: "end_date",
  header: "End Date",
  cell: ({ row }) => {
   const date = row.original.end_date
   return date ? (
    <span className="text-sm text-muted-foreground">
     {format(parseISO(date), "PPP")}
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
