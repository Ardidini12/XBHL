import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { LeaguesService } from "@/client"
import { Button } from "@/components/ui/button"
import {
 Dialog,
 DialogClose,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

interface DeleteLeagueProps {
 id: string
 onSuccess: () => void
}

const DeleteLeague = ({ id, onSuccess }: DeleteLeagueProps) => {
 const [isOpen, setIsOpen] = useState(false)
 const queryClient = useQueryClient()
 const { showSuccessToast, showErrorToast } = useCustomToast()
 const { handleSubmit } = useForm()

 const mutation = useMutation({
  mutationFn: (leagueId: string) =>
   LeaguesService.deleteLeague({ leagueId }),
  onSuccess: () => {
   showSuccessToast("League deleted successfully")
   setIsOpen(false)
   onSuccess()
  },
  onError: handleError.bind(showErrorToast),
  onSettled: () => {
   queryClient.invalidateQueries({ queryKey: ["leagues"] })
  },
 })

 const onSubmit = async () => {
  mutation.mutate(id)
 }

 return (
  <Dialog open={isOpen} onOpenChange={setIsOpen}>
   <DropdownMenuItem
    variant="destructive"
    onSelect={(e) => e.preventDefault()}
    onClick={() => setIsOpen(true)}
   >
    <Trash2 />
    Delete League
   </DropdownMenuItem>
   <DialogContent className="sm:max-w-md">
    <form onSubmit={handleSubmit(onSubmit)}>
     <DialogHeader>
      <DialogTitle>Delete League</DialogTitle>
      <DialogDescription>
       This action is <strong>permanent</strong>. Are you sure you want
       to delete this league? You will not be able to undo this action.
      </DialogDescription>
     </DialogHeader>

     <DialogFooter className="mt-4">
      <DialogClose asChild>
       <Button variant="outline" disabled={mutation.isPending}>
        Cancel
       </Button>
      </DialogClose>
      <LoadingButton
       variant="destructive"
       type="submit"
       loading={mutation.isPending}
      >
       Delete
      </LoadingButton>
     </DialogFooter>
    </form>
   </DialogContent>
  </Dialog>
 )
}

export default DeleteLeague
