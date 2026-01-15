"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Image as ImageIcon, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { UploadAssetDialog } from "./upload-asset-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Image from "next/image"

interface Asset {
  id: string
  type: string
  original_filename: string
  mime_type: string
  size_bytes: number
  storage_key: string
  public_url: string | null
  created_at: string
  signedUrl?: string | null
}

export function AssetsTab({ projectId }: { projectId: string }) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [filterType, setFilterType] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAssets = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from("assets")
        .select("*")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (filterType !== "all") {
        query = query.eq("type", filterType)
      }

      const { data, error } = await query

      if (error) throw error

      // Get signed URLs for private bucket
      const assetsWithUrls = await Promise.all(
        (data || []).map(async (asset) => {
          if (asset.storage_key) {
            const { data: urlData } = await supabase.storage
              .from("app-covers")
              .createSignedUrl(asset.storage_key, 3600)

            return {
              ...asset,
              signedUrl: urlData?.signedUrl || asset.public_url || null,
            }
          }
          return { ...asset, signedUrl: asset.public_url || null }
        })
      )

      setAssets(assetsWithUrls)
    } catch (error: any) {
      toast.error(error.message || "Failed to load assets")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, filterType])

  const handleAssetDeleted = () => {
    fetchAssets()
  }

  const handleAssetUploaded = () => {
    fetchAssets()
  }

  const handleDelete = async (assetId: string) => {
    try {
      const { error } = await supabase
        .from("assets")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", assetId)

      if (error) throw error

      toast.success("Asset deleted successfully")
      fetchAssets()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete asset")
    }
  }

  const groupedAssets = assets.reduce((acc, asset) => {
    if (!acc[asset.type]) {
      acc[asset.type] = []
    }
    acc[asset.type].push(asset)
    return acc
  }, {} as Record<string, Asset[]>)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="reference_cover">Reference Covers</SelectItem>
            <SelectItem value="app_screenshot">App Screenshots</SelectItem>
            <SelectItem value="brand_logo">Brand Logos</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <UploadAssetDialog projectId={projectId} onUploaded={handleAssetUploaded}>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Asset
          </Button>
        </UploadAssetDialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No assets uploaded yet</p>
          <UploadAssetDialog projectId={projectId} onUploaded={handleAssetUploaded}>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload your first asset
            </Button>
          </UploadAssetDialog>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAssets).map(([type, typeAssets]) => (
            <div key={type}>
              <h3 className="text-lg font-semibold mb-3 capitalize">
                {type.replace("_", " ")} ({typeAssets.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {typeAssets.map((asset) => (
                  <Card key={asset.id} className="relative group">
                    <CardContent className="p-0">
                      {asset.mime_type?.startsWith("image/") && asset.signedUrl ? (
                        <div className="relative aspect-square">
                          <Image
                            src={asset.signedUrl}
                            alt={asset.original_filename}
                            fill
                            className="object-cover rounded-t-lg"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDelete(asset.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-square flex items-center justify-center bg-muted">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-sm font-medium truncate">
                          {asset.original_filename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(asset.size_bytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
