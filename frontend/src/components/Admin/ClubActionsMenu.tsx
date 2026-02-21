import { useMutation, useQueryClient } from "@tanstack/react-query"
import { EllipsisVertical } from "lucide-react"
import { useState } from "react"

import type { ClubPublic } from "@/client"
import { ClubsService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import EditClub from "./EditClub"

interface ClubActionsMenuProps {
  club: ClubPublic
  leagueId: string
  seasonId: string
}

export const ClubActionsMenu = ({
  club,
  leagueId,
  seasonId,
}: ClubActionsMenuProps) => {
  const [open, setOpen] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const removeMutation = useMutation({
    mutationFn: () =>
      ClubsService.deleteClub({ leagueId, seasonId, clubId: club.id }),
    onSuccess: () => {
      showSuccessToast("Club removed from season")
      setShowRemoveDialog(false)
      queryClient.invalidateQueries({ queryKey: ["clubs", leagueId, seasonId] })
    },
    onError: handleError.bind(showErrorToast),
  })

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Club actions">
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setOpen(false)
              setShowEditDialog(true)
            }}
          >
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => {
              setOpen(false)
              setShowRemoveDialog(true)
            }}
          >
            Remove from Season
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditClub
        club={club}
        leagueId={leagueId}
        seasonId={seasonId}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove Club</DialogTitle>
            <DialogDescription>
              Remove <strong>{club.name}</strong> from this season? The club
              record will be preserved if it appears in other seasons.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoveDialog(false)}
              disabled={removeMutation.isPending}
            >
              Cancel
            </Button>
            <LoadingButton
              variant="destructive"
              onClick={() => removeMutation.mutate()}
              loading={removeMutation.isPending}
            >
              Remove
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
