"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Image as ImageIcon, Download, Trash2, Maximize2 } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface Output {
  id: string
  variant_index: number | null
  label: string | null
  mime_type: string | null
  size_bytes: number | null
  width: number | null
  height: number | null
  storage_key: string | null
  public_url: string | null
  created_at: string
  signedUrl?: string | null
}

export function OutputsTab({ projectId }: { projectId: string }) {
  const [outputs, setOutputs] = useState<Output[]>([])
  const [loading, setLoading] = useState(true)
  const [hasActiveJobs, setHasActiveJobs] = useState(false)
  const [selectedImage, setSelectedImage] = useState<{ url: string; label: string } | null>(null)
  const supabase = createClient()

  const fetchOutputs = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("generated_outputs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get signed URLs for private bucket
      const outputsWithUrls = await Promise.all(
        (data || []).map(async (output) => {
          if (output.storage_key) {
            const { data: urlData } = await supabase.storage
              .from("app-covers")
              .createSignedUrl(output.storage_key, 3600)

            return {
              ...output,
              signedUrl: urlData?.signedUrl || output.public_url || null,
            }
          }
          return { ...output, signedUrl: output.public_url || null }
        })
      )

      setOutputs(outputsWithUrls)
    } catch (error: any) {
      toast.error(error.message || "Failed to load outputs")
    } finally {
      setLoading(false)
    }
  }, [projectId, supabase])

  // Verificar si hay jobs activos
  const checkActiveJobs = useCallback(async () => {
    try {
      const { data: jobs } = await supabase
        .from("generation_jobs")
        .select("status")
        .eq("project_id", projectId)
        .in("status", ["queued", "running"])

      setHasActiveJobs(jobs ? jobs.length > 0 : false)
    } catch (error) {
      console.error("Error checking active jobs:", error)
      setHasActiveJobs(false)
    }
  }, [projectId, supabase])

  // Cargar outputs inicialmente
  useEffect(() => {
    fetchOutputs()
    checkActiveJobs()
  }, [fetchOutputs, checkActiveJobs])

  // Auto-refresh solo cuando hay jobs activos (para ver nuevos outputs)
  useEffect(() => {
    if (!hasActiveJobs) {
      return // No hacer polling si no hay jobs activos
    }

    const interval = setInterval(() => {
      fetchOutputs()
    }, 5000) // Refrescar cada 5 segundos

    return () => clearInterval(interval)
  }, [hasActiveJobs, fetchOutputs])

  // Verificar jobs activos periódicamente
  useEffect(() => {
    const checkInterval = setInterval(() => {
      checkActiveJobs()
    }, 10000) // Verificar cada 10 segundos

    return () => clearInterval(checkInterval)
  }, [checkActiveJobs])

  const handleDownload = async (output: Output) => {
    try {
      if (!output.signedUrl) {
        toast.error("Download URL not available")
        return
      }

      // Fetch the image
      const response = await fetch(output.signedUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${output.label || `output-${output.id}`}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Download started")
    } catch (error: any) {
      toast.error(error.message || "Failed to download")
    }
  }

  const handleDelete = async (outputId: string) => {
    try {
      const response = await fetch(`/api/outputs/${outputId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete output")
      }

      toast.success("Output deleted successfully")
      fetchOutputs() // Refresh the list
    } catch (error: any) {
      toast.error(error.message || "Failed to delete output")
    }
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : outputs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            No generated outputs yet. Create a job to generate covers.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {outputs.map((output) => (
              <Card key={output.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {output.mime_type?.startsWith("image/") && output.signedUrl ? (
                    <div className="relative aspect-square group cursor-pointer">
                      <Image
                        src={output.signedUrl!}
                        alt={output.label || `Output ${output.variant_index}`}
                        fill
                        className="object-cover"
                        onClick={() => setSelectedImage({
                          url: output.signedUrl!,
                          label: output.label || `Variant ${output.variant_index || "N/A"}`
                        })}
                      />
                      {/* Overlay con botones al hover */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(output)
                          }}
                          className="bg-background/95 hover:bg-background h-10 w-10"
                          title="Download"
                        >
                          <Download className="h-5 w-5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedImage({
                              url: output.signedUrl!,
                              label: output.label || `Variant ${output.variant_index || "N/A"}`
                            })
                          }}
                          className="bg-background/95 hover:bg-background h-10 w-10"
                          title="View full size"
                        >
                          <Maximize2 className="h-5 w-5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={(e) => e.stopPropagation()}
                              className="bg-destructive/95 hover:bg-destructive h-10 w-10"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this output. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(output.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square flex items-center justify-center bg-muted">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium">
                      {output.label || `Variant ${output.variant_index || "N/A"}`}
                    </p>
                    {output.width && output.height && (
                      <p className="text-xs text-muted-foreground">
                        {output.width} × {output.height}
                      </p>
                    )}
                    {output.size_bytes && (
                      <p className="text-xs text-muted-foreground">
                        {(output.size_bytes / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Dialog para ver imagen completa */}
          <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-2 bg-black/95 border-none">
              <DialogTitle className="sr-only">
                {selectedImage ? `Viewing ${selectedImage.label}` : "Image viewer"}
              </DialogTitle>
              {selectedImage && (
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
                    <Image
                      src={selectedImage.url}
                      alt={selectedImage.label}
                      width={1200}
                      height={1200}
                      className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg"
                      unoptimized
                    />
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
                    {selectedImage.label}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
