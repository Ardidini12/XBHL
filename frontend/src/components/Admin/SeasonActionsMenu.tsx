import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { EllipsisVertical } from "lucide-react"
import { useState } from "react"

import type { SeasonPublic } from "@/client"
import { SeasonsService } from "@/client"
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
import EditSeason from "./EditSeason"

interface SeasonActionsMenuProps {
  season: SeasonPublic
}

export const SeasonActionsMenu = ({ season }: SeasonActionsMenuProps) => {
  const [open, setOpen] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
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
      setShowEndDialog(false)
      queryClient.invalidateQueries({ queryKey: ["seasons", season.league_id] })
      queryClient.invalidateQueries({ queryKey: ["clubs-global"] })
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
      setShowDeleteDialog(false)
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
          <DropdownMenuItem asChild>
            <Link
              to="/leagues/$leagueId/seasons/$seasonId"
              params={{ leagueId: season.league_id, seasonId: season.id }}
            >
              Enter Season
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setOpen(false)
              setShowEditDialog(true)
            }}
          >
            Edit Name
          </DropdownMenuItem>
          {isActive && (
            <DropdownMenuItem
              onSelect={() => {
                setOpen(false)
                setShowEndDialog(true)
              }}
            >
              End Season
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
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

      <EditSeason
        season={season}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      {/* End Season Confirmation */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>End Season</DialogTitle>
            <DialogDescription>
              Are you sure you want to end <strong>{season.name}</strong>? This
              will set the end date to now and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEndDialog(false)}
              disabled={endMutation.isPending}
            >
              Cancel
            </Button>
            <LoadingButton
              onClick={() => endMutation.mutate()}
              loading={endMutation.isPending}
            >
              End Season
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Season</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{season.name}</strong>?
              This action cannot be undone.
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
