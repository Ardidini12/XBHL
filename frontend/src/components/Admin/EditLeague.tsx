import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { type LeaguePublic, LeaguesService } from "@/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const formSchema = z.object({
 name: z
  .string()
  .min(1, { message: "League name is required" })
  .max(255, { message: "League name must be at most 255 characters" })
  .optional(),
 league_type: z.enum(["3v3", "6v6"]).optional(),
 is_active: z.boolean().optional(),
 description: z.string().optional().nullable(),
})

type FormData = z.infer<typeof formSchema>

interface EditLeagueProps {
 league: LeaguePublic
 onSuccess: () => void
}

const EditLeague = ({ league, onSuccess }: EditLeagueProps) => {
 const [isOpen, setIsOpen] = useState(false)
 const queryClient = useQueryClient()
 const { showSuccessToast, showErrorToast } = useCustomToast()

 const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  mode: "onBlur",
  criteriaMode: "all",
  defaultValues: {
   name: league.name,
   league_type: league.league_type,
   is_active: league.is_active,
   description: league.description ?? "",
  },
 })

 const mutation = useMutation({
  mutationFn: (data: FormData) =>
   LeaguesService.updateLeague({
    leagueId: league.id,
    requestBody: {
     ...data,
     description: data.description || null,
    },
   }),
  onSuccess: () => {
   showSuccessToast("League updated successfully")
   setIsOpen(false)
   onSuccess()
  },
  onError: handleError.bind(showErrorToast),
  onSettled: () => {
   queryClient.invalidateQueries({ queryKey: ["leagues"] })
  },
 })

 // Reset form with fresh league values every time the dialog opens
 useEffect(() => {
  if (isOpen) {
   form.reset({
    name: league.name,
    league_type: league.league_type,
    is_active: league.is_active,
    description: league.description ?? "",
   })
  }
 }, [isOpen, league, form])

 const onSubmit = (data: FormData) => {
  mutation.mutate(data)
 }

 return (
  <Dialog open={isOpen} onOpenChange={setIsOpen}>
   <DropdownMenuItem
    onSelect={(e) => e.preventDefault()}
    onClick={() => setIsOpen(true)}
   >
    <Pencil />
    Edit League
   </DropdownMenuItem>
   <DialogContent className="sm:max-w-md">
    <Form {...form}>
     <form onSubmit={form.handleSubmit(onSubmit)}>
      <DialogHeader>
       <DialogTitle>Edit League</DialogTitle>
       <DialogDescription>
        Update the league details below.
       </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
       <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
         <FormItem>
          <FormLabel>
           League Name <span className="text-destructive">*</span>
          </FormLabel>
          <FormControl>
           <Input
            placeholder="e.g. VVHL League"
            type="text"
            {...field}
           />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />

       <FormField
        control={form.control}
        name="league_type"
        render={({ field }) => (
         <FormItem>
          <FormLabel>League Type</FormLabel>
          <Select
           onValueChange={field.onChange}
           value={field.value}
          >
           <FormControl>
            <SelectTrigger>
             <SelectValue placeholder="Select league type" />
            </SelectTrigger>
           </FormControl>
           <SelectContent>
            <SelectItem value="3v3">3v3</SelectItem>
            <SelectItem value="6v6">6v6</SelectItem>
           </SelectContent>
          </Select>
          <FormMessage />
         </FormItem>
        )}
       />

       <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Description</FormLabel>
          <FormControl>
           <Input
            placeholder="Optional description"
            type="text"
            {...field}
            value={field.value ?? ""}
           />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />

       <FormField
        control={form.control}
        name="is_active"
        render={({ field }) => (
         <FormItem className="flex items-center gap-3 space-y-0">
          <FormControl>
           <Checkbox
            checked={field.value}
            onCheckedChange={field.onChange}
           />
          </FormControl>
          <FormLabel className="font-normal">Is active?</FormLabel>
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

export default EditLeague
