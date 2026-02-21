import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Library } from "lucide-react"
import { useState } from "react"

import { ClubsService, GlobalClubsService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

interface AddFromExistingProps {
  leagueId: string
  seasonId: string
}

const AddFromExisting = ({ leagueId, seasonId }: AddFromExistingProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: allClubs, isLoading } = useQuery({
    queryKey: ["clubs-global"],
    queryFn: () => GlobalClubsService.readAllClubs({ skip: 0, limit: 500 }),
    enabled: isOpen,
    staleTime: 1000 * 60,
  })

  const { data: seasonClubs } = useQuery({
    queryKey: ["clubs", leagueId, seasonId],
    queryFn: () =>
      ClubsService.readClubs({ leagueId, seasonId, skip: 0, limit: 500 }),
    enabled: isOpen,
    staleTime: 1000 * 60,
  })

  const alreadyInSeason = new Set(seasonClubs?.data.map((c) => c.id) ?? [])

  const filtered = (allClubs?.data ?? []).filter(
    (c) =>
      !alreadyInSeason.has(c.id) &&
      c.name.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const mutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = []
      for (const clubId of ids) {
        results.push(
          await ClubsService.assignClub({ leagueId, seasonId, clubId }),
        )
      }
      return results
    },
    onSuccess: (results) => {
      showSuccessToast(
        `${results.length} club${results.length > 1 ? "s" : ""} added to season`,
      )
      setSelectedIds(new Set())
      setSearch("")
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["clubs", leagueId, seasonId] })
    },
  })

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedIds(new Set())
      setSearch("")
    }
    setIsOpen(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="my-4">
          <Library className="mr-2" />
          Add from Existing
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add from Existing Clubs</DialogTitle>
          <DialogDescription>
            Select clubs already on the platform to add to this season.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <Input
            placeholder="Search clubs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="border rounded-md max-h-64 overflow-y-auto">
            {isLoading && (
              <p className="text-sm text-muted-foreground p-3">Loading...</p>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground p-3 italic">
                {alreadyInSeason.size > 0 && (allClubs?.data.length ?? 0) === alreadyInSeason.size
                  ? "All platform clubs are already in this season."
                  : "No clubs found."}
              </p>
            )}
            {filtered.map((club) => {
              const selected = selectedIds.has(club.id)
              return (
                <button
                  key={club.id}
                  type="button"
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors ${
                    selected ? "bg-muted" : ""
                  }`}
                  onClick={() => toggleSelect(club.id)}
                >
                  {club.logo_url ? (
                    <img
                      src={club.logo_url}
                      alt={club.name}
                      className="h-6 w-6 rounded object-contain flex-shrink-0"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded bg-muted-foreground/20 flex items-center justify-center text-xs flex-shrink-0">
                      ?
                    </div>
                  )}
                  <span className="flex-1 text-sm font-medium">{club.name}</span>
                  {selected && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
          {selectedIds.size > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedIds.size} club{selectedIds.size > 1 ? "s" : ""} selected
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={mutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <LoadingButton
            loading={mutation.isPending}
            disabled={selectedIds.size === 0}
            onClick={() => mutation.mutate(Array.from(selectedIds))}
          >
            Add {selectedIds.size > 0 ? `${selectedIds.size} Club${selectedIds.size > 1 ? "s" : ""}` : ""}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddFromExisting
