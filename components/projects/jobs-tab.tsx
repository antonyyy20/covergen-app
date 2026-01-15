"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Eye, X, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { GuidedJobWizard } from "./guided-job-wizard"
import { JobDetailsDialog } from "./job-details-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Job {
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
}

export function JobsTab({ projectId }: { projectId: string }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("generation_jobs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setJobs(data || [])
    } catch (error: any) {
      toast.error(error.message || "Failed to load jobs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Polling para jobs que están corriendo o en cola
  useEffect(() => {
    const hasActiveJobs = jobs.some(
      (job) => job.status === "running" || job.status === "queued"
    )

    if (hasActiveJobs) {
      const interval = setInterval(() => {
        fetchJobs()
      }, 3000) // Refrescar cada 3 segundos

      return () => clearInterval(interval)
    }
  }, [jobs, projectId])

  const handleCancel = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: "PATCH",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to cancel")
      }
      toast.success("Generation cancelled")
      fetchJobs()
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel generation")
    }
  }

  const handleRestart = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/generate`, {
        method: "POST",
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Generation failed")
      }
      toast.success("Generation restarted!")
      fetchJobs()
    } catch (error: any) {
      toast.error(error.message || "Failed to restart generation")
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
      <Badge 
        variant={variants[status] || "outline"}
        className={status === "running" ? "animate-pulse" : ""}
      >
        {status}
        {status === "running" && (
          <span className="ml-2">⚡</span>
        )}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <GuidedJobWizard projectId={projectId} onCreated={fetchJobs}>
          <Button>
            <Sparkles className="mr-2 h-4 w-4" />
            Create Generation
          </Button>
        </GuidedJobWizard>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No generations yet</p>
          <GuidedJobWizard projectId={projectId} onCreated={fetchJobs}>
            <Button>
              <Sparkles className="mr-2 h-4 w-4" />
              Create your first generation
            </Button>
          </GuidedJobWizard>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Target Store</TableHead>
                <TableHead>Variations</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell>{job.model || "-"}</TableCell>
                  <TableCell>{job.target_store || "-"}</TableCell>
                  <TableCell>{job.num_variations || 0}</TableCell>
                  <TableCell>
                    {new Date(job.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(job.status === "queued" || job.status === "running") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancel(job.id)}
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {(job.status === "failed" || job.status === "cancelled") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRestart(job.id)}
                          title="Restart"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedJob(job)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedJob && (
        <JobDetailsDialog
          job={selectedJob}
          open={!!selectedJob}
          onOpenChange={(open) => !open && setSelectedJob(null)}
          onGenerate={async () => {
            try {
              const response = await fetch(`/api/jobs/${selectedJob.id}/generate`, {
                method: "POST",
              })
              if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Generation failed")
              }
              toast.success("Generation started!")
              fetchJobs()
            } catch (error: any) {
              toast.error(error.message || "Failed to start generation")
            }
          }}
          onCancel={() => {
            fetchJobs()
            setSelectedJob(null)
          }}
          onRefresh={fetchJobs}
        />
      )}
    </div>
  )
}
