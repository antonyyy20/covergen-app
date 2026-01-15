"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const projectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  platform: z.enum(["ios", "android", "both"]),
  app_name: z.string().optional(),
  locale: z.string().optional(),
  notes: z.string().optional(),
})

type ProjectForm = z.infer<typeof projectSchema>

interface EditProjectDialogProps {
  project: {
    id: string
    title: string
    platform: string
    app_name?: string | null
    locale?: string | null
    notes?: string | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: (project: any) => void
}

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
  onUpdated,
}: EditProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: project.title,
      platform: (project.platform === "ios" || project.platform === "android" || project.platform === "both") 
        ? project.platform 
        : "both",
      app_name: project.app_name || undefined,
      locale: project.locale || undefined,
      notes: project.notes || undefined,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        title: project.title,
        platform: (project.platform === "ios" || project.platform === "android" || project.platform === "both") 
          ? project.platform 
          : "both",
        app_name: project.app_name || undefined,
        locale: project.locale || undefined,
        notes: project.notes || undefined,
      })
    }
  }, [open, project, reset])

  const platform = watch("platform")

  const onSubmit = async (data: ProjectForm) => {
    setIsLoading(true)
    try {
      const { data: updatedProject, error } = await supabase
        .from("projects")
        .update({
          title: data.title,
          platform: data.platform,
          app_name: data.app_name || null,
          locale: data.locale || null,
          notes: data.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", project.id)
        .select()
        .single()

      if (error) throw error

      toast.success("Project updated successfully!")
      onOpenChange(false)
      if (onUpdated) {
        onUpdated(updatedProject)
      }
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update project")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update project details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="My App Covers"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="platform">Platform *</Label>
            <Select
              value={platform}
              onValueChange={(value) => setValue("platform", value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ios">iOS</SelectItem>
                <SelectItem value="android">Android</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="app_name">App Name</Label>
            <Input
              id="app_name"
              placeholder="My Awesome App"
              {...register("app_name")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="locale">Locale</Label>
            <Input id="locale" placeholder="en-US" {...register("locale")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              {...register("notes")}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
