import { EllipsisVertical } from "lucide-react"
import { useState } from "react"

import type { LeaguePublic } from "@/client"
import { Button } from "@/components/ui/button"
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import DeleteLeague from "./DeleteLeague"
import EditLeague from "./EditLeague"

interface LeagueActionsMenuProps {
 league: LeaguePublic
}

export const LeagueActionsMenu = ({ league }: LeagueActionsMenuProps) => {
 const [open, setOpen] = useState(false)

 return (
  <DropdownMenu open={open} onOpenChange={setOpen}>
   <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
     <EllipsisVertical />
    </Button>
   </DropdownMenuTrigger>
   <DropdownMenuContent align="end">
    <EditLeague league={league} onSuccess={() => setOpen(false)} />
    <DeleteLeague id={league.id} onSuccess={() => setOpen(false)} />
   </DropdownMenuContent>
  </DropdownMenu>
 )
}
