import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Minus, Plus } from "lucide-react"
import { useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"

import { type ClubCreate, ClubsService } from "@/client"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const clubRowSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Club name is required" })
    .max(255, { message: "Max 255 characters" }),
  ea_id: z.string().max(255).optional().or(z.literal("")),
  logo_url: z
    .string()
    .url({ message: "Must be a valid URL" })
    .optional()
    .or(z.literal("")),
})

const formSchema = z.object({
  clubs: z.array(clubRowSchema).min(1),
})

type FormData = z.infer<typeof formSchema>

const emptyRow = { name: "", ea_id: "", logo_url: "" }

interface AddClubsToSeasonProps {
  leagueId: string
  seasonId: string
}

const AddClubsToSeason = ({ leagueId, seasonId }: AddClubsToSeasonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: { clubs: [emptyRow] },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "clubs",
  })

  const mutation = useMutation({
    mutationFn: async (clubs: ClubCreate[]) => {
      const results = []
      for (const club of clubs) {
        results.push(
          await ClubsService.createClub({ leagueId, seasonId, requestBody: club }),
        )
      }
      return results
    },
    onSuccess: (results) => {
      showSuccessToast(
        `${results.length} club${results.length > 1 ? "s" : ""} added to season`,
      )
      form.reset({ clubs: [emptyRow] })
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["clubs", leagueId, seasonId] })
    },
  })

  const onSubmit = (data: FormData) => {
    const payload: ClubCreate[] = data.clubs.map((c) => ({
      name: c.name,
      ea_id: c.ea_id || null,
      logo_url: c.logo_url || null,
    }))
    mutation.mutate(payload)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) form.reset({ clubs: [emptyRow] })
    setIsOpen(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="my-4">
          <Plus className="mr-2" />
          Add New Club
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Club(s) to Season</DialogTitle>
          <DialogDescription>
            Create new clubs and add them to this season. Use "Add from Existing"
            to assign clubs already on the platform.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border rounded-lg p-4 flex flex-col gap-3 relative"
                >
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(index)}
                      disabled={mutation.isPending}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Club {index + 1}
                  </p>
                  <FormField
                    control={form.control}
                    name={`clubs.${index}.name`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>
                          Club Name <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Club 1"
                            type="text"
                            {...f}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`clubs.${index}.ea_id`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>EA Club ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. 123456"
                            type="text"
                            {...f}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`clubs.${index}.logo_url`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Logo URL (.webp)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/logo.webp"
                            type="text"
                            {...f}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => append(emptyRow)}
                disabled={mutation.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another Club
              </Button>
            </div>
            <DialogFooter className="mt-2">
              <DialogClose asChild>
                <Button variant="outline" disabled={mutation.isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <LoadingButton type="submit" loading={mutation.isPending}>
                Add {fields.length > 1 ? `${fields.length} Clubs` : "Club"}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AddClubsToSeason
