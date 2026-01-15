"use client"

import { useState } from "react"
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
  DialogTrigger,
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

interface CreateProjectDialogProps {
  children: React.ReactNode
  onCreated?: (project: any) => void
}

export function CreateProjectDialog({
  children,
  onCreated,
}: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false)
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
      platform: "ios",
    },
  })

  const platform = watch("platform")

  const onSubmit = async (data: ProjectForm) => {
    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: data.title,
          platform: data.platform,
          app_name: data.app_name || null,
          locale: data.locale || null,
          notes: data.notes || null,
        })
        .select()
        .single()

      if (error) throw error

      toast.success("Project created successfully!")
      setOpen(false)
      reset()
      if (onCreated) {
        onCreated(project)
      }
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to create project")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project for generating app store covers
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
            {errors.platform && (
              <p className="text-sm text-destructive">
                {errors.platform.message}
              </p>
            )}
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
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
