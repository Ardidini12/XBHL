import { useNavigate } from "@tanstack/react-router"
import { EllipsisVertical } from "lucide-react"
import { useState } from "react"

import type { LeaguePublic } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import DeleteLeague from "./DeleteLeague"
import EditLeague from "./EditLeague"

interface LeagueActionsMenuProps {
  league: LeaguePublic
}

export const LeagueActionsMenu = ({ league }: LeagueActionsMenuProps) => {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More actions">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => {
            setOpen(false)
            navigate({
              to: "/leagues/$leagueId",
              params: { leagueId: league.id },
            })
          }}
        >
          Enter League
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <EditLeague league={league} onSuccess={() => setOpen(false)} />
        <DeleteLeague id={league.id} onSuccess={() => setOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
