"use client"

import { useState, useRef } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface UploadAssetDialogProps {
  projectId: string
  children: React.ReactNode
  onUploaded?: () => void
}

export function UploadAssetDialog({
  projectId,
  children,
  onUploaded,
}: UploadAssetDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [assetType, setAssetType] = useState<string>("reference_cover")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      // Generate asset ID
      const assetId = crypto.randomUUID()
      const ext = file.name.split(".").pop()
      const storageKey = `projects/${projectId}/assets/${assetId}.${ext}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("app-covers")
        .upload(storageKey, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get file dimensions if image
      let width = null
      let height = null
      if (file.type.startsWith("image/")) {
        const img = new Image()
        img.src = URL.createObjectURL(file)
        await new Promise((resolve, reject) => {
          img.onload = () => {
            width = img.width
            height = img.height
            URL.revokeObjectURL(img.src)
            resolve(null)
          }
          img.onerror = reject
        })
      }

      // Insert asset record
      const { error: insertError } = await supabase.from("assets").insert({
        id: assetId,
        project_id: projectId,
        user_id: user.id,
        type: assetType,
        original_filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        width,
        height,
        storage_provider: "supabase",
        storage_key: storageKey,
        public_url: null, // Using signed URLs
      })

      if (insertError) throw insertError

      toast.success("Asset uploaded successfully!")
      setOpen(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      if (onUploaded) {
        onUploaded()
      }
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to upload asset")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Asset</DialogTitle>
          <DialogDescription>
            Upload screenshots, logos, or reference images for this project
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Asset Type</Label>
            <Select value={assetType} onValueChange={setAssetType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reference_cover">Reference Cover</SelectItem>
                <SelectItem value="app_screenshot">App Screenshot</SelectItem>
                <SelectItem value="brand_logo">Brand Logo</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <input
              ref={fileInputRef}
              id="file"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
