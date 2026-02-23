import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Settings } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { SchedulersService } from "@/client"
import type { SchedulerConfigPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const DAYS = [
  { label: "Mon", value: 0 },
  { label: "Tue", value: 1 },
  { label: "Wed", value: 2 },
  { label: "Thu", value: 3 },
  { label: "Fri", value: 4 },
  { label: "Sat", value: 5 },
  { label: "Sun", value: 6 },
]

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: `${String(i).padStart(2, "0")}:00`,
}))

const formSchema = z
  .object({
    days_of_week: z
      .array(z.number())
      .min(1, { message: "Select at least one day" }),
    start_hour: z.string(),
    end_hour: z.string(),
    interval_minutes: z
      .number({ message: "Must be a number" })
      .min(1, { message: "Minimum 1 minute" })
      .max(1440, { message: "Maximum 1440 minutes" }),
  })
  .refine((d) => Number(d.start_hour) < Number(d.end_hour), {
    message: "Start hour must be before end hour",
    path: ["end_hour"],
  })

type FormData = z.infer<typeof formSchema>

interface SchedulerConfigModalProps {
  seasonId: string
}

/**
 * Modal dialog UI for viewing and managing a season's scheduler configuration.
 *
 * Renders a Settings-triggered dialog that loads an existing scheduler (when opened),
 * shows its status, and provides a form to create or update the scheduler (active days,
 * start/end hours, and fetch interval). When a config exists, control buttons to start,
 * pause, resume, stop, and delete the scheduler are also exposed.
 *
 * @param seasonId - Identifier of the season whose scheduler will be fetched and managed
 * @returns The SchedulerConfigModal component JSX for configuring a season's scheduler
 */
export function SchedulerConfigModal({ seasonId }: SchedulerConfigModalProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: existing } = useQuery({
    queryFn: () => SchedulersService.getScheduler({ seasonId }),
    queryKey: ["scheduler", seasonId],
    retry: false,
    enabled: open,
  })

  const hasConfig = !!existing

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      days_of_week: [],
      start_hour: "18",
      end_hour: "23",
      interval_minutes: 30,
    },
  })

  useEffect(() => {
    if (existing) {
      form.reset({
        days_of_week: existing.days_of_week ?? [],
        start_hour: String(existing.start_hour),
        end_hour: String(existing.end_hour),
        interval_minutes: existing.interval_minutes,
      })
    }
  }, [existing, form])

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const body = {
        days_of_week: data.days_of_week,
        start_hour: Number(data.start_hour),
        end_hour: Number(data.end_hour),
        interval_minutes: data.interval_minutes,
      }
      if (hasConfig) {
        return SchedulersService.updateScheduler({
          seasonId,
          requestBody: body,
        })
      }
      return SchedulersService.createScheduler({
        seasonId,
        requestBody: body,
      })
    },
    onSuccess: () => {
      showSuccessToast(
        hasConfig ? "Scheduler updated" : "Scheduler created",
      )
      queryClient.invalidateQueries({ queryKey: ["scheduler", seasonId] })
      queryClient.invalidateQueries({ queryKey: ["schedulers"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  const startMutation = useMutation({
    mutationFn: () => SchedulersService.startScheduler({ seasonId }),
    onSuccess: () => {
      showSuccessToast("Scheduler started")
      queryClient.invalidateQueries({ queryKey: ["scheduler", seasonId] })
      queryClient.invalidateQueries({ queryKey: ["schedulers"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  const stopMutation = useMutation({
    mutationFn: () => SchedulersService.stopScheduler({ seasonId }),
    onSuccess: () => {
      showSuccessToast("Scheduler stopped")
      queryClient.invalidateQueries({ queryKey: ["scheduler", seasonId] })
      queryClient.invalidateQueries({ queryKey: ["schedulers"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  const pauseMutation = useMutation({
    mutationFn: () => SchedulersService.pauseScheduler({ seasonId }),
    onSuccess: () => {
      showSuccessToast("Scheduler paused")
      queryClient.invalidateQueries({ queryKey: ["scheduler", seasonId] })
      queryClient.invalidateQueries({ queryKey: ["schedulers"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  const resumeMutation = useMutation({
    mutationFn: () => SchedulersService.resumeScheduler({ seasonId }),
    onSuccess: () => {
      showSuccessToast("Scheduler resumed")
      queryClient.invalidateQueries({ queryKey: ["scheduler", seasonId] })
      queryClient.invalidateQueries({ queryKey: ["schedulers"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  const deleteMutation = useMutation({
    mutationFn: () => SchedulersService.deleteScheduler({ seasonId }),
    onSuccess: () => {
      showSuccessToast("Scheduler deleted")
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["scheduler", seasonId] })
      queryClient.invalidateQueries({ queryKey: ["schedulers"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  const onSubmit = (data: FormData) => saveMutation.mutate(data)

  const statusBadge = (cfg: SchedulerConfigPublic) => {
    if (!cfg.is_active)
      return <Badge variant="secondary">Stopped</Badge>
    if (cfg.is_paused)
      return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Paused</Badge>
    return <Badge className="bg-green-600 text-white">Running</Badge>
  }

  const anyPending =
    saveMutation.isPending ||
    startMutation.isPending ||
    stopMutation.isPending ||
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    deleteMutation.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Configure scheduler">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Scheduler Configuration
            {existing && statusBadge(existing)}
          </DialogTitle>
          <DialogDescription>
            Configure when the scheduler fetches EA match data for this season.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Days of week */}
            <FormField
              control={form.control}
              name="days_of_week"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Active Days</FormLabel>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map((day) => {
                      const checked = field.value.includes(day.value)
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            if (checked) {
                              field.onChange(
                                field.value.filter((v) => v !== day.value),
                              )
                            } else {
                              field.onChange([...field.value, day.value])
                            }
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                            checked
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
                          }`}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start / End hour */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_hour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Hour (UTC)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Start" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-52">
                        {HOURS.map((h) => (
                          <SelectItem key={h.value} value={h.value}>
                            {h.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_hour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Hour (UTC)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="End" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-52">
                        {HOURS.map((h) => (
                          <SelectItem key={h.value} value={h.value}>
                            {h.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Interval */}
            <FormField
              control={form.control}
              name="interval_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fetch Interval</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={1440}
                        className="w-28"
                        {...field}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <span className="text-sm text-muted-foreground">
                      minutes
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              {/* Control buttons (only if config exists) */}
              {hasConfig && (
                <div className="flex gap-2 flex-wrap">
                  {!existing?.is_active && (
                    <LoadingButton
                      type="button"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      loading={startMutation.isPending}
                      disabled={anyPending}
                      onClick={() => startMutation.mutate()}
                    >
                      Start
                    </LoadingButton>
                  )}
                  {existing?.is_active && !existing?.is_paused && (
                    <>
                      <LoadingButton
                        type="button"
                        variant="outline"
                        className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                        loading={pauseMutation.isPending}
                        disabled={anyPending}
                        onClick={() => pauseMutation.mutate()}
                      >
                        Pause
                      </LoadingButton>
                      <LoadingButton
                        type="button"
                        variant="outline"
                        className="text-destructive border-destructive hover:bg-destructive/10"
                        loading={stopMutation.isPending}
                        disabled={anyPending}
                        onClick={() => stopMutation.mutate()}
                      >
                        Stop
                      </LoadingButton>
                    </>
                  )}
                  {existing?.is_paused && (
                    <LoadingButton
                      type="button"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      loading={resumeMutation.isPending}
                      disabled={anyPending}
                      onClick={() => resumeMutation.mutate()}
                    >
                      Resume
                    </LoadingButton>
                  )}
                  <LoadingButton
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    loading={deleteMutation.isPending}
                    disabled={anyPending}
                    onClick={() => deleteMutation.mutate()}
                  >
                    Delete
                  </LoadingButton>
                </div>
              )}

              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={anyPending}
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  loading={saveMutation.isPending}
                  disabled={anyPending}
                >
                  {hasConfig ? "Update" : "Create"}
                </LoadingButton>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
