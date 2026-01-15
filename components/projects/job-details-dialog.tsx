"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, AlertCircle, X, RotateCcw } from "lucide-react"
import { toast } from "sonner"

interface JobDetailsDialogProps {
  job: {
    id: string
    status: string
    provider: string | null
    model: string | null
    prompt: string | null
    target_store: string | null
    num_variations: number | null
    created_at: string
    finished_at: string | null
    error_message: string | null
    critique?: string | null
    job_config?: any
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate?: () => void
  onCancel?: () => void
  onRefresh?: () => void
}

export function JobDetailsDialog({
  job,
  open,
  onOpenChange,
  onGenerate,
  onCancel,
  onRefresh,
}: JobDetailsDialogProps) {
  const [jobAssets, setJobAssets] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      fetchJobAssets()
    }
  }, [open, job.id])

  const fetchJobAssets = async () => {
    try {
      const { data, error } = await supabase
        .from("job_assets")
        .select("role, assets(*)")
        .eq("job_id", job.id)

      if (error) throw error
      setJobAssets(data || [])
    } catch (error: any) {
      toast.error("Failed to load job assets")
    }
  }

  const handleCancel = async () => {
    try {
      const response = await fetch(`/api/jobs/${job.id}/cancel`, {
        method: "PATCH",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to cancel")
      }
      toast.success("Generation cancelled")
      if (onCancel) {
        onCancel()
      }
      if (onRefresh) {
        onRefresh()
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel generation")
    }
  }

  const handleRestart = async () => {
    if (onGenerate) {
      onGenerate()
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      queued: "secondary",
      running: "default",
      succeeded: "default",
      failed: "destructive",
      cancelled: "outline",
    }
    return (
      <Badge variant={variants[status] || "outline"}>{status}</Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
              <DialogTitle>Generation Details</DialogTitle>
              <DialogDescription>Generation information</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge(job.status)}
            </div>
            <Separator />
          </div>
          <div>
            <span className="text-sm font-medium">Prompt</span>
            <p className="text-sm text-muted-foreground mt-1">{job.prompt || "-"}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium">Model</span>
              <p className="text-sm text-muted-foreground">{job.model || "-"}</p>
            </div>
            <div>
              <span className="text-sm font-medium">Target Store</span>
              <p className="text-sm text-muted-foreground">{job.target_store || "-"}</p>
            </div>
            <div>
              <span className="text-sm font-medium">Variations</span>
              <p className="text-sm text-muted-foreground">{job.num_variations || 0}</p>
            </div>
            <div>
              <span className="text-sm font-medium">Created</span>
              <p className="text-sm text-muted-foreground">
                {new Date(job.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          {job.finished_at && (
            <div>
              <span className="text-sm font-medium">Finished</span>
              <p className="text-sm text-muted-foreground">
                {new Date(job.finished_at).toLocaleString()}
              </p>
            </div>
          )}
          {job.error_message && (
            <div>
              <span className="text-sm font-medium text-destructive">Error</span>
              <p className="text-sm text-muted-foreground">{job.error_message}</p>
            </div>
          )}
          {job.critique && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Design Critique
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {job.critique}
                </p>
              </CardContent>
            </Card>
          )}
          {/* Action Buttons */}
          <div className="pt-4 space-y-2">
            {(job.status === "queued" || job.status === "running") && (
              <Button
                onClick={handleCancel}
                variant="destructive"
                className="w-full"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel Generation
              </Button>
            )}
            {(job.status === "failed" || job.status === "cancelled") && onGenerate && (
              <Button onClick={handleRestart} className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                Restart Generation
              </Button>
            )}
            {job.status === "queued" && onGenerate && (
              <Button onClick={handleRestart} className="w-full">
                <Sparkles className="mr-2 h-4 w-4" />
                Start Generation
              </Button>
            )}
          </div>
          {jobAssets.length > 0 && (
            <div>
              <span className="text-sm font-medium">Selected Assets</span>
              <div className="mt-2 space-y-1">
                {jobAssets.map((ja, index) => (
                  <p key={index} className="text-sm text-muted-foreground">
                    • {(ja.assets as any)?.original_filename || "Unknown"} ({ja.role})
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
