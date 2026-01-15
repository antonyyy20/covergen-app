"use client"

import { useState, useEffect } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { processGenerationJob } from "@/app/actions/generate-covers"

const jobSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  model: z.enum(["nano", "banana"]),
  target_store: z.string().min(1, "Target store is required"),
  num_variations: z.number().min(1).max(10),
  assetIds: z.array(z.string()).min(0),
})

type JobForm = z.infer<typeof jobSchema>

interface CreateJobDialogProps {
  projectId: string
  children: React.ReactNode
  onCreated?: () => void
}

export function CreateJobDialog({
  projectId,
  children,
  onCreated,
}: CreateJobDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [availableAssets, setAvailableAssets] = useState<any[]>([])
  const supabase = createClient()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<JobForm>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      model: "nano",
      num_variations: 1,
      assetIds: [],
    },
  })

  const selectedAssetIds = watch("assetIds") || []

  useEffect(() => {
    if (open) {
      fetchAssets()
    }
  }, [open])

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("id, type, original_filename")
        .eq("project_id", projectId)
        .in("type", ["reference_cover", "app_screenshot"])
        .is("deleted_at", null)

      if (error) throw error
      setAvailableAssets(data || [])
    } catch (error: any) {
      toast.error("Failed to load assets")
    }
  }

  const toggleAsset = (assetId: string) => {
    const current = selectedAssetIds || []
    if (current.includes(assetId)) {
      setValue("assetIds", current.filter((id) => id !== assetId))
    } else {
      setValue("assetIds", [...current, assetId])
    }
  }

  const onSubmit = async (data: JobForm) => {
    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      // Create job
      const { data: job, error: jobError } = await supabase
        .from("generation_jobs")
        .insert({
          project_id: projectId,
          user_id: user.id,
          status: "queued",
          provider: "gemini",
          model: data.model,
          prompt: data.prompt,
          target_store: data.target_store,
          num_variations: data.num_variations,
        })
        .select()
        .single()

      if (jobError) throw jobError

      // Create job_assets relationships
      if (data.assetIds.length > 0) {
        const jobAssets = data.assetIds.map((assetId, index) => ({
          job_id: job.id,
          asset_id: assetId,
          role:
            availableAssets.find((a) => a.id === assetId)?.type ===
            "reference_cover"
              ? "reference"
              : "screenshot",
        }))

        const { error: assetsError } = await supabase
          .from("job_assets")
          .insert(jobAssets)

        if (assetsError) throw assetsError
      }

      toast.success("Job created! Starting generation...")
      
      // Trigger processing in background (don't wait for it)
      processGenerationJob({
        jobId: job.id,
        projectId: projectId,
        userId: user.id,
        prompt: data.prompt,
        model: data.model,
        targetStore: data.target_store,
        numVariations: data.num_variations,
        assetIds: data.assetIds,
      }).catch((error: any) => {
        console.error("Background processing error:", error)
        // Error handling is done in the action
      })

      setOpen(false)
      reset()
      if (onCreated) {
        onCreated()
      }
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to create job")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Generation Job</DialogTitle>
          <DialogDescription>
            Configure settings for generating app store covers
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt *</Label>
            <Textarea
              id="prompt"
              placeholder="Describe the style and elements you want in the cover..."
              {...register("prompt")}
              rows={4}
            />
            {errors.prompt && (
              <p className="text-sm text-destructive">{errors.prompt.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Select
                value={watch("model")}
                onValueChange={(value) => setValue("model", value as "nano" | "banana")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nano">Nano</SelectItem>
                  <SelectItem value="banana">Banana</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_store">Target Store *</Label>
              <Input
                id="target_store"
                placeholder="ios or android"
                {...register("target_store")}
              />
              {errors.target_store && (
                <p className="text-sm text-destructive">
                  {errors.target_store.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="num_variations">Number of Variations</Label>
            <Input
              id="num_variations"
              type="number"
              min={1}
              max={10}
              {...register("num_variations", { valueAsNumber: true })}
            />
            {errors.num_variations && (
              <p className="text-sm text-destructive">
                {errors.num_variations.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Select Input Assets (Optional)</Label>
            <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
              {availableAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No reference covers or screenshots available
                </p>
              ) : (
                availableAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedAssetIds.includes(asset.id)}
                      onCheckedChange={() => toggleAsset(asset.id)}
                    />
                    <Label className="text-sm font-normal cursor-pointer">
                      {asset.original_filename} ({asset.type.replace("_", " ")})
                    </Label>
                  </div>
                ))
              )}
            </div>
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
              {isLoading ? "Creating..." : "Create Job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
