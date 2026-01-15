"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  Image as ImageIcon,
  Smartphone,
  Palette,
  Target,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { STYLE_PRESETS, type JobConfig, buildCoverPrompt, getAspectRatio } from "@/lib/prompt-builder"
import { critiqueCoverConfig, type CritiqueResult } from "@/lib/cover-critique"
import { cn } from "@/lib/utils"
import Image from "next/image"

const wizardSchema = z.object({
  // Step 1
  targetStore: z.enum(["appstore", "playstore", "both"]),
  goal: z.enum(["attention", "clarity", "trust", "premium", "playful"]),
  appCategory: z.string().min(1, "Category is required"),
  mainMessage: z.string().min(5, "Message must be at least 5 characters").max(100),

  // Step 2
  stylePreset: z.string().min(1, "Style preset is required"),

  // Step 3
  selectedAssets: z.array(
    z.object({
      assetId: z.string(),
      role: z.enum(["reference_cover", "app_screenshot", "brand_logo"]),
    })
  ),

  // Step 4
  variants: z.array(
    z.object({
      id: z.string(),
      enabled: z.boolean(),
    })
  ),
})

type WizardForm = z.infer<typeof wizardSchema>

interface GuidedJobWizardProps {
  projectId: string
  children: React.ReactNode
  onCreated?: () => void
}

const VARIANTS = [
  {
    id: "A",
    name: "Big Headline + Screenshot",
    description: "Prominent headline with one screenshot",
    enabled: true,
  },
  {
    id: "B",
    name: "Phone Mockup + Gradient",
    description: "Phone mockup with gradient background and 2 screenshots",
    enabled: true,
  },
  {
    id: "C",
    name: "UI-First Collage",
    description: "Multiple screenshots in a clean collage layout",
    enabled: false,
  },
  {
    id: "D",
    name: "Minimal Premium",
    description: "One screenshot with lots of whitespace",
    enabled: false,
  },
]

const APP_CATEGORIES = [
  "Fitness",
  "Fintech",
  "Productivity",
  "Education",
  "Games",
  "Health",
  "Travel",
  "Food",
  "Social",
  "Entertainment",
  "Business",
  "Lifestyle",
  "Other",
]

export function GuidedJobWizard({ projectId, children, onCreated }: GuidedJobWizardProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [availableAssets, setAvailableAssets] = useState<any[]>([])
  const [assetPreviews, setAssetPreviews] = useState<Record<string, string>>({})
  const [critique, setCritique] = useState<CritiqueResult | null>(null)
  const [generationCount, setGenerationCount] = useState<number | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<WizardForm>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      targetStore: "appstore",
      goal: "attention",
      appCategory: "",
      mainMessage: "",
      stylePreset: "minimal",
      selectedAssets: [],
      variants: VARIANTS.map((v) => ({ id: v.id, enabled: v.enabled })),
    },
  })

  const formValues = watch()
  const selectedAssets = watch("selectedAssets")
  const targetStore = watch("targetStore")
  const goal = watch("goal")
  const appCategory = watch("appCategory")
  const mainMessage = watch("mainMessage")
  const stylePreset = watch("stylePreset")
  const variants = watch("variants")

  // Memoize selectedAssets and variants to prevent infinite loops
  const selectedAssetsKey = useMemo(
    () => JSON.stringify(selectedAssets || []),
    [selectedAssets]
  )
  const variantsKey = useMemo(
    () => JSON.stringify(variants || []),
    [variants]
  )

  const fetchGenerationCount = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setGenerationCount(0)
        return
      }

      const { count, error } = await supabase
        .from("generation_jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      if (error) {
        console.error("Error fetching generation count:", error)
        setGenerationCount(0)
        return
      }

      setGenerationCount(count || 0)
    } catch (error) {
      console.error("Error fetching generation count:", error)
      setGenerationCount(0)
    }
  }

  useEffect(() => {
    if (open) {
      fetchAssets()
      fetchGenerationCount()
      reset()
      setStep(0) // Start at step 0 (requirements check)
      setCritique(null)
    }
  }, [open])

  useEffect(() => {
    // Update critique when form changes (only on step 3)
    if (step === 3) {
      const assetCounts = {
        referenceCovers: selectedAssets?.filter(
          (sa) => sa.role === "reference_cover"
        ).length || 0,
        screenshots: selectedAssets?.filter(
          (sa) => sa.role === "app_screenshot"
        ).length || 0,
        logos: selectedAssets?.filter((sa) => sa.role === "brand_logo").length || 0,
      }

      const config: JobConfig = {
        targetStore: targetStore || "appstore",
        goal: goal || "attention",
        appCategory: appCategory || "",
        mainMessage: mainMessage || "",
        stylePreset: stylePreset || "minimal",
        selectedAssets: selectedAssets || [],
        variants: variants || [],
      }

      const result = critiqueCoverConfig(config, assetCounts)
      setCritique(result)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedAssetsKey, targetStore, goal, appCategory, mainMessage, stylePreset, variantsKey])

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("id, type, original_filename, storage_key")
        .eq("project_id", projectId)
        .is("deleted_at", null)

      if (error) throw error
      setAvailableAssets(data || [])

      // Fetch signed URLs for previews
      const previews: Record<string, string> = {}
      for (const asset of data || []) {
        if (asset.storage_key) {
          const { data: urlData } = await supabase.storage
            .from("app-covers")
            .createSignedUrl(asset.storage_key, 3600)
          if (urlData?.signedUrl) {
            previews[asset.id] = urlData.signedUrl
          }
        }
      }
      setAssetPreviews(previews)
    } catch (error: any) {
      toast.error("Failed to load assets")
    }
  }

  const updateCritique = useCallback(() => {
    const assetCounts = {
      referenceCovers: selectedAssets?.filter(
        (sa) => sa.role === "reference_cover"
      ).length || 0,
      screenshots: selectedAssets?.filter(
        (sa) => sa.role === "app_screenshot"
      ).length || 0,
      logos: selectedAssets?.filter((sa) => sa.role === "brand_logo").length || 0,
    }

    const config: JobConfig = {
      targetStore: targetStore || "appstore",
      goal: goal || "attention",
      appCategory: appCategory || "",
      mainMessage: mainMessage || "",
      stylePreset: stylePreset || "minimal",
      selectedAssets: selectedAssets || [],
      variants: variants || [],
    }

    const result = critiqueCoverConfig(config, assetCounts)
    setCritique(result)
  }, [selectedAssets, targetStore, goal, appCategory, mainMessage, stylePreset, variants])

  const toggleAsset = (assetId: string, role: "reference_cover" | "app_screenshot" | "brand_logo") => {
    const current = formValues.selectedAssets || []
    const existing = current.findIndex((sa) => sa.assetId === assetId && sa.role === role)

    if (existing >= 0) {
      // Remove
      setValue(
        "selectedAssets",
        current.filter((_, i) => i !== existing)
      )
    } else {
      // Add
      setValue("selectedAssets", [...current, { assetId, role }])
    }
  }

  const toggleVariant = (variantId: string) => {
    const current = formValues.variants || []
    setValue(
      "variants",
      current.map((v) => (v.id === variantId ? { ...v, enabled: !v.enabled } : v))
    )
  }

  const onSubmit = async (data: WizardForm) => {
    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error("You must be logged in")
        return
      }

      // Check generation limit (5 per user)
      const { count, error: countError } = await supabase
        .from("generation_jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      if (countError) {
        throw new Error("Failed to check generation limit")
      }

      if (count !== null && count >= 5) {
        toast.error("You have reached the maximum limit of 5 generations. Please delete some generations to create new ones.")
        setIsLoading(false)
        return
      }

      // Build prompt
      const config: JobConfig = {
        targetStore: data.targetStore,
        goal: data.goal,
        appCategory: data.appCategory,
        mainMessage: data.mainMessage,
        stylePreset: data.stylePreset,
        selectedAssets: data.selectedAssets,
        variants: data.variants.filter((v) => v.enabled),
      }

      const prompt = buildCoverPrompt(config, availableAssets)
      const aspectRatio = getAspectRatio(data.targetStore)

      // Get critique
      const assetCounts = {
        referenceCovers: data.selectedAssets.filter((sa) => sa.role === "reference_cover").length,
        screenshots: data.selectedAssets.filter((sa) => sa.role === "app_screenshot").length,
        logos: data.selectedAssets.filter((sa) => sa.role === "brand_logo").length,
      }
      const critiqueResult = critiqueCoverConfig(config, assetCounts)

      // Create job
      const { data: job, error: jobError } = await supabase
        .from("generation_jobs")
        .insert({
          project_id: projectId,
          user_id: user.id,
          status: "queued",
          provider: "gemini",
          model: "gemini-1.5-flash",
          prompt,
          target_store: data.targetStore,
          aspect_ratio: aspectRatio.ratio,
          num_variations: data.variants.filter((v) => v.enabled).length,
          requested_outputs: {
            variants: data.variants.filter((v) => v.enabled).map((v) => v.id),
          },
          job_config: config,
          critique: critiqueResult.summary,
        })
        .select()
        .single()

      if (jobError) throw jobError

      // Create job_assets
      if (data.selectedAssets.length > 0) {
        const jobAssets = data.selectedAssets.map((sa) => ({
          job_id: job.id,
          asset_id: sa.assetId,
          role: sa.role,
        }))

        const { error: assetsError } = await supabase.from("job_assets").insert(jobAssets)
        if (assetsError) throw assetsError
      }

      toast.success("Generation created! Starting generation...")
      
      // Trigger generation automatically
      try {
        const response = await fetch(`/api/jobs/${job.id}/generate`, {
          method: "POST",
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Generation failed")
        }
      } catch (error: any) {
        console.error("Generation trigger error:", error)
        toast.error("Generation created but failed to start. You can retry from generation details.")
      }

      // Update generation count after successful creation
      await fetchGenerationCount()
      
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

  const nextStep = () => {
    if (step < 4) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 0:
        return (
          availableAssets.filter(a => a.type === "reference_cover").length > 0 &&
          availableAssets.filter(a => a.type === "app_screenshot").length >= 2
        )
      case 1:
        return (
          formValues.targetStore &&
          formValues.goal &&
          formValues.appCategory &&
          formValues.mainMessage &&
          formValues.mainMessage.length >= 5
        )
      case 2:
        return formValues.stylePreset
      case 3:
        const refCovers = formValues.selectedAssets?.filter((sa) => sa.role === "reference_cover")
          .length || 0
        const screenshots = formValues.selectedAssets?.filter(
          (sa) => sa.role === "app_screenshot"
        ).length || 0
        return refCovers >= 1 && screenshots >= 2
      case 4:
        const enabled = formValues.variants?.filter((v) => v.enabled).length || 0
        return enabled > 0
      default:
        return false
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create Cover Generation</DialogTitle>
          <DialogDescription>
            Follow the guided steps to create high-quality app store covers
          </DialogDescription>
          {generationCount !== null && (
            <div className={cn(
              "mt-2 text-sm px-3 py-1.5 rounded-md inline-block",
              generationCount >= 5
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            )}>
              Generations used: {generationCount} / 5
              {generationCount >= 5 && (
                <span className="ml-2 font-semibold">(Limit reached)</span>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Step 0: Requirements Check */}
        {step === 0 && (
          <div className="space-y-6 py-4">
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                What You Need Before Starting
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    availableAssets.filter(a => a.type === "reference_cover").length > 0
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {availableAssets.filter(a => a.type === "reference_cover").length > 0 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="text-xs">1</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">At least 1 Reference Cover</p>
                    <p className="text-sm text-muted-foreground">
                      Upload example covers you like for style inspiration
                    </p>
                    {availableAssets.filter(a => a.type === "reference_cover").length === 0 && (
                      <p className="text-xs text-destructive mt-1">
                        Go to Assets tab to upload reference covers
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    availableAssets.filter(a => a.type === "app_screenshot").length >= 2
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {availableAssets.filter(a => a.type === "app_screenshot").length >= 2 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="text-xs">2</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">At least 2 App Screenshots</p>
                    <p className="text-sm text-muted-foreground">
                      Upload screenshots of your app for content reference
                    </p>
                    {availableAssets.filter(a => a.type === "app_screenshot").length < 2 && (
                      <p className="text-xs text-destructive mt-1">
                        {availableAssets.filter(a => a.type === "app_screenshot").length === 0
                          ? "Go to Assets tab to upload app screenshots"
                          : `Need ${2 - availableAssets.filter(a => a.type === "app_screenshot").length} more screenshot(s)`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    "bg-muted text-muted-foreground"
                  )}>
                    <span className="text-xs">?</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Brand Logo (Optional)</p>
                    <p className="text-sm text-muted-foreground">
                      Upload your brand logo for better brand consistency
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const hasRefCovers = availableAssets.filter(a => a.type === "reference_cover").length > 0
                  const hasScreenshots = availableAssets.filter(a => a.type === "app_screenshot").length >= 2
                  if (hasRefCovers && hasScreenshots) {
                    setStep(1)
                  } else {
                    toast.error("Please upload the required assets first")
                  }
                }}
                disabled={
                  availableAssets.filter(a => a.type === "reference_cover").length === 0 ||
                  availableAssets.filter(a => a.type === "app_screenshot").length < 2
                }
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Progress Steps and Form */}
        {step > 0 && (
          <>
            <div className="flex items-center justify-between mb-6">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-semibold",
                      step >= s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                  </div>
                  {s < 4 && (
                    <div
                      className={cn(
                        "flex-1 h-1 mx-2",
                        step > s ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Goal & Context */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Goal & Context
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetStore">Target Store *</Label>
                  <Select
                    value={formValues.targetStore}
                    onValueChange={(value) => setValue("targetStore", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="appstore">App Store (iOS)</SelectItem>
                      <SelectItem value="playstore">Play Store (Android)</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">Design Goal *</Label>
                  <Select
                    value={formValues.goal}
                    onValueChange={(value) => setValue("goal", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attention">Grab Attention</SelectItem>
                      <SelectItem value="clarity">Communicate Clearly</SelectItem>
                      <SelectItem value="trust">Build Trust</SelectItem>
                      <SelectItem value="premium">Premium Feel</SelectItem>
                      <SelectItem value="playful">Playful & Fun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appCategory">App Category *</Label>
                <Select
                  value={formValues.appCategory}
                  onValueChange={(value) => setValue("appCategory", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.appCategory && (
                  <p className="text-sm text-destructive">{errors.appCategory.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mainMessage">Main Message / Value Proposition *</Label>
                <Textarea
                  id="mainMessage"
                  placeholder="e.g., 'Track your fitness goals with AI-powered insights'"
                  {...register("mainMessage")}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {formValues.mainMessage?.length || 0}/100 characters
                </p>
                {errors.mainMessage && (
                  <p className="text-sm text-destructive">{errors.mainMessage.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Style Preset */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Style Preset
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a style that matches your app's personality
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(STYLE_PRESETS).map((preset) => (
                  <Card
                    key={preset.id}
                    className={cn(
                      "cursor-pointer transition-all",
                      formValues.stylePreset === preset.id
                        ? "ring-2 ring-primary"
                        : "hover:border-primary/50"
                    )}
                    onClick={() => setValue("stylePreset", preset.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">{preset.name}</CardTitle>
                      <CardDescription>{preset.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{preset.tone}</Badge>
                        <Badge variant="outline">{preset.contrast} contrast</Badge>
                        <Badge variant="outline">{preset.density} density</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Assets */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Select Assets
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select at least 1 reference cover and 2 app screenshots
                </p>
              </div>

              {availableAssets.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      No assets available. Upload assets first in the Assets tab.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Reference Covers */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">
                      Reference Covers (Style Inspiration) *
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {availableAssets
                        .filter((a) => a.type === "reference_cover")
                        .map((asset) => {
                          const isSelected = formValues.selectedAssets?.some(
                            (sa) => sa.assetId === asset.id && sa.role === "reference_cover"
                          )
                          return (
                            <Card
                              key={asset.id}
                              className={cn(
                                "cursor-pointer transition-all relative",
                                isSelected ? "ring-2 ring-primary" : "hover:border-primary/50"
                              )}
                              onClick={() => toggleAsset(asset.id, "reference_cover")}
                            >
                              {assetPreviews[asset.id] && (
                                <div className="relative aspect-square">
                                  <Image
                                    src={assetPreviews[asset.id]}
                                    alt={asset.original_filename}
                                    fill
                                    className="object-cover rounded-t-lg"
                                  />
                                </div>
                              )}
                              <CardContent className="p-3">
                                <p className="text-xs truncate">{asset.original_filename}</p>
                                {isSelected && (
                                  <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-primary" />
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                    </div>
                    {formValues.selectedAssets?.filter((sa) => sa.role === "reference_cover")
                      .length === 0 && (
                      <p className="text-sm text-destructive mt-2">
                        At least 1 reference cover is required
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* App Screenshots */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">
                      App Screenshots (Content) *
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {availableAssets
                        .filter((a) => a.type === "app_screenshot")
                        .map((asset) => {
                          const isSelected = formValues.selectedAssets?.some(
                            (sa) => sa.assetId === asset.id && sa.role === "app_screenshot"
                          )
                          return (
                            <Card
                              key={asset.id}
                              className={cn(
                                "cursor-pointer transition-all relative",
                                isSelected ? "ring-2 ring-primary" : "hover:border-primary/50"
                              )}
                              onClick={() => toggleAsset(asset.id, "app_screenshot")}
                            >
                              {assetPreviews[asset.id] && (
                                <div className="relative aspect-square">
                                  <Image
                                    src={assetPreviews[asset.id]}
                                    alt={asset.original_filename}
                                    fill
                                    className="object-cover rounded-t-lg"
                                  />
                                </div>
                              )}
                              <CardContent className="p-3">
                                <p className="text-xs truncate">{asset.original_filename}</p>
                                {isSelected && (
                                  <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-primary" />
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                    </div>
                    {formValues.selectedAssets?.filter((sa) => sa.role === "app_screenshot")
                      .length < 2 && (
                      <p className="text-sm text-destructive mt-2">
                        At least 2 app screenshots are required
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Brand Logos (Optional) */}
                  {availableAssets.filter((a) => a.type === "brand_logo").length > 0 && (
                    <div>
                      <Label className="text-base font-semibold mb-3 block">
                        Brand Logos (Optional)
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {availableAssets
                          .filter((a) => a.type === "brand_logo")
                          .map((asset) => {
                            const isSelected = formValues.selectedAssets?.some(
                              (sa) => sa.assetId === asset.id && sa.role === "brand_logo"
                            )
                            return (
                              <Card
                                key={asset.id}
                                className={cn(
                                  "cursor-pointer transition-all relative",
                                  isSelected ? "ring-2 ring-primary" : "hover:border-primary/50"
                                )}
                                onClick={() => toggleAsset(asset.id, "brand_logo")}
                              >
                                {assetPreviews[asset.id] && (
                                  <div className="relative aspect-square">
                                    <Image
                                      src={assetPreviews[asset.id]}
                                      alt={asset.original_filename}
                                      fill
                                      className="object-cover rounded-t-lg"
                                    />
                                  </div>
                                )}
                                <CardContent className="p-3">
                                  <p className="text-xs truncate">{asset.original_filename}</p>
                                  {isSelected && (
                                    <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-primary" />
                                  )}
                                </CardContent>
                              </Card>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  {/* Critique Preview */}
                  {critique && (
                    <Card className={cn("mt-4", critique.score < 70 && "border-destructive")}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          {critique.score >= 70 ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-destructive" />
                          )}
                          Configuration Review
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-3">{critique.summary}</p>
                        {critique.issues.length > 0 && (
                          <div className="space-y-2">
                            {critique.issues.map((issue, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "flex items-start gap-2 text-sm p-2 rounded",
                                  issue.severity === "error" && "bg-destructive/10",
                                  issue.severity === "warning" && "bg-yellow-500/10",
                                  issue.severity === "info" && "bg-blue-500/10"
                                )}
                              >
                                {issue.severity === "error" && (
                                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                                )}
                                {issue.severity === "warning" && (
                                  <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                                )}
                                {issue.severity === "info" && (
                                  <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                                )}
                                <div>
                                  <p className="font-medium">{issue.message}</p>
                                  {issue.suggestion && (
                                    <p className="text-muted-foreground text-xs mt-1">
                                      {issue.suggestion}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Variants */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Select Variants
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose which layout variants to generate (select 1-4)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {VARIANTS.map((variant) => {
                  const formVariant = formValues.variants?.find((v) => v.id === variant.id)
                  const isEnabled = formVariant?.enabled || false
                  return (
                    <Card
                      key={variant.id}
                      className={cn(
                        "cursor-pointer transition-all",
                        isEnabled ? "ring-2 ring-primary" : "hover:border-primary/50"
                      )}
                      onClick={() => toggleVariant(variant.id)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Variant {variant.id}</CardTitle>
                          <Checkbox checked={isEnabled} onCheckedChange={() => toggleVariant(variant.id)} />
                        </div>
                        <CardDescription>{variant.name}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{variant.description}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {formValues.variants?.filter((v) => v.enabled).length === 0 && (
                <p className="text-sm text-destructive">At least one variant must be selected</p>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            <div>
              {step > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {step < 4 ? (
                <Button type="button" onClick={nextStep} disabled={!canProceed()}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isLoading || !canProceed() || (generationCount !== null && generationCount >= 5)}
                >
                  {isLoading ? "Creating..." : "Create Generation"}
                  {generationCount !== null && generationCount >= 5 && (
                    <span className="ml-2 text-xs">(Limit reached)</span>
                  )}
                  <Sparkles className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
