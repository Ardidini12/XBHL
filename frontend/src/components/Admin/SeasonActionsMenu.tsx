import { EllipsisVertical } from "lucide-react"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { SeasonPublic } from "@/client"
import { SeasonsService } from "@/client"
import { Button } from "@/components/ui/button"
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

interface SeasonActionsMenuProps {
 season: SeasonPublic
}

export const SeasonActionsMenu = ({ season }: SeasonActionsMenuProps) => {
 const [open, setOpen] = useState(false)
 const [showEndDialog, setShowEndDialog] = useState(false)
 const [showDeleteDialog, setShowDeleteDialog] = useState(false)
 const queryClient = useQueryClient()
 const { showSuccessToast, showErrorToast } = useCustomToast()

 const endMutation = useMutation({
  mutationFn: () =>
   SeasonsService.endSeason({
    leagueId: season.league_id,
    seasonId: season.id,
   }),
  onSuccess: () => {
   showSuccessToast("Season ended successfully")
   queryClient.invalidateQueries({ queryKey: ["seasons", season.league_id] })
  },
  onError: handleError.bind(showErrorToast),
 })

 const deleteMutation = useMutation({
  mutationFn: () =>
   SeasonsService.deleteSeason({
    leagueId: season.league_id,
    seasonId: season.id,
   }),
  onSuccess: () => {
   showSuccessToast("Season deleted successfully")
   queryClient.invalidateQueries({ queryKey: ["seasons", season.league_id] })
  },
  onError: handleError.bind(showErrorToast),
 })

 const isActive = !season.end_date

 return (
  <>
   <DropdownMenu open={open} onOpenChange={setOpen}>
    <DropdownMenuTrigger asChild>
     <Button variant="ghost" size="icon" aria-label="Season actions">
      <EllipsisVertical />
     </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
     {isActive && (
      <>
       <DropdownMenuItem
        onSelect={() => {
         setOpen(false)
         setShowEndDialog(true)
        }}
       >
        End Season
       </DropdownMenuItem>
       <DropdownMenuSeparator />
      </>
     )}
     <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onSelect={() => {
       setOpen(false)
       setShowDeleteDialog(true)
      }}
     >
      Delete
     </DropdownMenuItem>
    </DropdownMenuContent>
   </DropdownMenu>

   {/* End Season Confirmation */}
   <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
    <DialogContent showCloseButton={false}>
     <DialogHeader>
      <DialogTitle>End Season</DialogTitle>
      <DialogDescription>
       Are you sure you want to end <strong>{season.name}</strong>? This will
       set the end date to now and cannot be undone.
      </DialogDescription>
     </DialogHeader>
     <DialogFooter>
      <Button variant="outline" onClick={() => setShowEndDialog(false)}>
       Cancel
      </Button>
      <Button
       onClick={() => { endMutation.mutate(); setShowEndDialog(false) }}
       disabled={endMutation.isPending}
      >
       End Season
      </Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   {/* Delete Confirmation */}
   <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
    <DialogContent showCloseButton={false}>
     <DialogHeader>
      <DialogTitle>Delete Season</DialogTitle>
      <DialogDescription>
       Are you sure you want to delete <strong>{season.name}</strong>? This
       action cannot be undone.
      </DialogDescription>
     </DialogHeader>
     <DialogFooter>
      <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
       Cancel
      </Button>
      <Button
       variant="destructive"
       onClick={() => { deleteMutation.mutate(); setShowDeleteDialog(false) }}
       disabled={deleteMutation.isPending}
      >
       Delete
      </Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>
  </>
 )
}
