import { useMutation, useQueryClient } from "@tanstack/react-query"
import { EllipsisVertical } from "lucide-react"
import { useState } from "react"

import type { ClubPublic } from "@/client"
import { GlobalClubsService } from "@/client"
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
import EditClubGlobal from "./EditClubGlobal"

interface ClubActionsMenuGlobalProps {
  club: ClubPublic
}

export const ClubActionsMenuGlobal = ({ club }: ClubActionsMenuGlobalProps) => {
  const [open, setOpen] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const deleteMutation = useMutation({
    mutationFn: () => GlobalClubsService.deleteClub({ clubId: club.id }),
    onSuccess: () => {
      showSuccessToast("Club deleted from platform")
      setShowDeleteDialog(false)
      queryClient.invalidateQueries({ queryKey: ["clubs-global"] })
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
              setShowDeleteDialog(true)
            }}
          >
            Delete from Platform
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditClubGlobal
        club={club}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Club</DialogTitle>
            <DialogDescription>
              Permanently delete <strong>{club.name}</strong> from the platform?
              This will remove it from all seasons.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <LoadingButton
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              loading={deleteMutation.isPending}
            >
              Delete
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
