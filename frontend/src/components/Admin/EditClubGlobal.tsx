import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { GlobalClubsService, type ClubUpdate } from "@/client"
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

const formSchema = z.object({
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

type FormData = z.infer<typeof formSchema>

interface EditClubGlobalProps {
  club: {
    id: string
    name: string
    ea_id?: string | null
    logo_url?: string | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EditClubGlobal = ({ club, open, onOpenChange }: EditClubGlobalProps) => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: club.name,
      ea_id: club.ea_id ?? "",
      logo_url: club.logo_url ?? "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: club.name,
        ea_id: club.ea_id ?? "",
        logo_url: club.logo_url ?? "",
      })
    }
  }, [open, club, form])

  const mutation = useMutation({
    mutationFn: (data: ClubUpdate) =>
      GlobalClubsService.updateClub({ clubId: club.id, requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Club updated successfully")
      onOpenChange(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["clubs-global"] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      name: data.name,
      ea_id: data.ea_id || null,
      logo_url: data.logo_url || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Club</DialogTitle>
          <DialogDescription>
            Update info for <strong>{club.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Club Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ea_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>EA Club ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 123456" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logo_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL (.webp)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/logo.webp"
                        type="text"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={mutation.isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <LoadingButton type="submit" loading={mutation.isPending}>
                Save
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default EditClubGlobal
