import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { type LeagueCreate, LeaguesService } from "@/client"
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
  .max(255, { message: "League name must be at most 255 characters" }),
 league_type: z.enum(["3v3", "6v6"] as const, {
  message: "Please select a league type",
 }),
 is_active: z.boolean(),
 description: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

const AddLeague = () => {
 const [isOpen, setIsOpen] = useState(false)
 const queryClient = useQueryClient()
 const { showSuccessToast, showErrorToast } = useCustomToast()

 const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  mode: "onBlur",
  criteriaMode: "all",
  defaultValues: {
   name: "",
   league_type: "3v3",
   is_active: true,
   description: "",
  },
 })

 const mutation = useMutation({
  mutationFn: (data: LeagueCreate) =>
   LeaguesService.createLeague({ requestBody: data }),
  onSuccess: () => {
   showSuccessToast("League created successfully")
   form.reset()
   setIsOpen(false)
  },
  onError: handleError.bind(showErrorToast),
  onSettled: () => {
   queryClient.invalidateQueries({ queryKey: ["leagues"] })
  },
 })

 const onSubmit = (data: FormData) => {
  const payload: LeagueCreate = {
   name: data.name,
   league_type: data.league_type,
   is_active: data.is_active,
   description: data.description ?? null,
  }
  mutation.mutate(payload)
 }

 return (
  <Dialog open={isOpen} onOpenChange={setIsOpen}>
   <DialogTrigger asChild>
    <Button className="my-4">
     <Plus className="mr-2" />
     Add League
    </Button>
   </DialogTrigger>
   <DialogContent className="sm:max-w-md">
    <DialogHeader>
     <DialogTitle>Add League</DialogTitle>
     <DialogDescription>
      Fill in the form below to create a new league.
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
           League Name <span className="text-destructive">*</span>
          </FormLabel>
          <FormControl>
           <Input
            placeholder="League Name"
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
          <FormLabel>
           League Type <span className="text-destructive">*</span>
          </FormLabel>
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

export default AddLeague
