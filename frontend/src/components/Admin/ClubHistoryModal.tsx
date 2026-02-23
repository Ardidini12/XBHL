import { History } from "lucide-react"

import type { ClubPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ClubHistoryModalProps {
  club: ClubPublic
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClubHistoryModal({
  club,
  open,
  onOpenChange,
}: ClubHistoryModalProps) {
  const history = club.history ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {club.logo_url ? (
              <img
                src={club.logo_url}
                alt={club.name}
                className="h-10 w-10 rounded object-contain"
              />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-sm text-muted-foreground">
                ?
              </div>
            )}
            <div>
              <DialogTitle className="text-lg">{club.name}</DialogTitle>
              {club.ea_id && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  EA ID: {club.ea_id}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Season History</span>
            <Badge variant="secondary" className="text-xs">
              {history.length} {history.length === 1 ? "season" : "seasons"}
            </Badge>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              This club has not been assigned to any season yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
              {history.map((h) => (
                <div
                  key={`${h.league_id}-${h.season_id}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{h.season_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {h.league_name}
                    </span>
                  </div>
                  <Badge
                    variant={h.is_active ? "default" : "outline"}
                    className="text-xs shrink-0"
                  >
                    {h.is_active ? "Active" : "Ended"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
