import { createClient } from "@/lib/supabase/server"
import { generateImagesWithGemini } from "@/lib/ai/gemini-image-client"
import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"

// Lazy import Gemini only if needed for prompt enhancement
async function enhancePromptWithGemini(
  prompt: string,
  context: string,
  referenceImages?: Array<{ mimeType: string; data: string }>
): Promise<string> {
  try {
    // Only import if GOOGLE_API_KEY is available
    if (!process.env.GOOGLE_API_KEY) {
      return prompt // Return original if no API key
    }
    
    const { generateImagePrompt } = await import("@/lib/gemini/client")
    return await generateImagePrompt(prompt, context, referenceImages)
  } catch (error) {
    console.warn("Gemini prompt enhancement not available, using original prompt:", error)
    return prompt
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch job
    const { data: job, error: jobError } = await supabase
      .from("generation_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Allow regenerating queued, failed, or cancelled jobs
    if (job.status !== "queued" && job.status !== "failed" && job.status !== "cancelled") {
      return NextResponse.json(
        { error: `Job is ${job.status}, cannot regenerate` },
        { status: 400 }
      )
    }

    // If job was cancelled, reset it to queued
    if (job.status === "cancelled") {
      await supabase
        .from("generation_jobs")
        .update({
          status: "queued",
          error_message: null,
          finished_at: null,
        })
        .eq("id", jobId)
    }

    // Update job to running
    await supabase
      .from("generation_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", jobId)

    // Fetch job assets with roles
    const { data: jobAssets, error: assetsError } = await supabase
      .from("job_assets")
      .select("asset_id, role")
      .eq("job_id", jobId)

    if (assetsError) {
      throw assetsError
    }

    // Separate assets by role
    const referenceCoverIds = jobAssets?.filter((ja) => ja.role === "reference_cover").map((ja) => ja.asset_id) || []
    const screenshotIds = jobAssets?.filter((ja) => ja.role === "app_screenshot").map((ja) => ja.asset_id) || []
    const logoIds = jobAssets?.filter((ja) => ja.role === "brand_logo").map((ja) => ja.asset_id) || []

    const allAssetIds = [...referenceCoverIds, ...screenshotIds, ...logoIds]
    const referenceImages: Array<{ mimeType: string; data: string }> = []
    const screenshots: Array<{ mimeType: string; data: string }> = []

    if (allAssetIds.length > 0) {
      const { data: assets, error: assetsDataError } = await supabase
        .from("assets")
        .select("id, storage_key, mime_type")
        .in("id", allAssetIds)
        .is("deleted_at", null)

      if (assetsDataError) {
        throw assetsDataError
      }

      // Download and convert assets to base64, separated by role
      for (const asset of assets || []) {
        if (!asset.storage_key) continue

        const jobAsset = jobAssets?.find((ja) => ja.asset_id === asset.id)
        if (!jobAsset) continue

        const { data: fileData, error: downloadError } = await supabase.storage
          .from("app-covers")
          .download(asset.storage_key)

        if (downloadError || !fileData) {
          console.warn(`Failed to download asset ${asset.id}:`, downloadError)
          continue
        }

        const arrayBuffer = await fileData.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = buffer.toString("base64")
        const mimeType = asset.mime_type || "image/png"

        const imageData = { mimeType, data: base64 }

        // Separate by role
        if (jobAsset.role === "reference_cover" || jobAsset.role === "brand_logo") {
          referenceImages.push(imageData)
        } else if (jobAsset.role === "app_screenshot") {
          screenshots.push(imageData)
        }
      }
    }

    console.log(`Loaded ${referenceImages.length} reference images and ${screenshots.length} screenshots`)

    // Enhance prompt using Gemini (if available and reference images exist)
    let enhancedPrompt = job.prompt || ""
    
    if (process.env.GOOGLE_API_KEY && (referenceImages.length > 0 || screenshots.length > 0)) {
      try {
        const context = `Reference covers: ${referenceImages.length}, Screenshots: ${screenshots.length}`
        // Pass reference images for prompt enhancement
        enhancedPrompt = await enhancePromptWithGemini(
          job.prompt || "",
          context,
          referenceImages.length > 0 ? referenceImages : undefined
        )
        console.log("Enhanced prompt with Gemini:", enhancedPrompt.substring(0, 100))
      } catch (error) {
        console.warn("Failed to enhance prompt with Gemini, using original:", error)
        // Continue with original prompt
      }
    }

    // Generate images using Gemini API ONLY
    // Map model names from job to Gemini model types
    let geminiModel: "nano" | "banana" | "pro" = "nano"
    const jobModel = (job.model as string) || ""
    
    if (jobModel.includes("pro")) {
      geminiModel = "pro"
    } else if (jobModel.includes("banana") || jobModel.includes("1.5-pro")) {
      geminiModel = "banana"
    } else {
      geminiModel = "nano"
    }
    
    const numVariations = job.num_variations || 1
    
    // Generate images using Gemini API
    const generatedImages = await generateImagesWithGemini({
      prompt: enhancedPrompt,
      model: geminiModel,
      numVariations: numVariations,
      aspectRatio: (job.aspect_ratio as any) || "1:1",
      referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
      screenshots: screenshots.length > 0 ? screenshots : undefined,
    })

    // Process and upload each generated image
    const aspectRatio = job.aspect_ratio === "1024:500" 
      ? { width: 1024, height: 500 }
      : { width: 1024, height: 1024 }

    for (let i = 0; i < generatedImages.length; i++) {
      const imageData = generatedImages[i]
      
      // Gemini returns base64 images directly
      const imageBuffer = Buffer.from(imageData.data, "base64")

      // Resize and format image
      let finalBuffer: Buffer
      try {
        finalBuffer = await sharp(imageBuffer)
          .resize(aspectRatio.width, aspectRatio.height, {
            fit: "cover",
            position: "center",
          })
          .png()
          .toBuffer()
      } catch (error) {
        // If sharp fails, use original buffer
        console.warn("Sharp processing failed, using original:", error)
        finalBuffer = imageBuffer
      }

      // Upload to storage
      const outputId = crypto.randomUUID()
      const storageKey = `projects/${job.project_id}/outputs/${jobId}/${outputId}.png`

      const { error: uploadError } = await supabase.storage
        .from("app-covers")
        .upload(storageKey, finalBuffer, {
          contentType: "image/png",
          upsert: false,
        })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw new Error(`Failed to upload output ${i + 1}: ${uploadError.message}`)
      }

      // Get image metadata
      let width = aspectRatio.width
      let height = aspectRatio.height
      try {
        const metadata = await sharp(finalBuffer).metadata()
        width = metadata.width || width
        height = metadata.height || height
      } catch (error) {
        // Use defaults if metadata extraction fails
      }

      // Insert output record
      const { error: insertError } = await supabase
        .from("generated_outputs")
        .insert({
          id: outputId,
          job_id: jobId,
          project_id: job.project_id,
          user_id: user.id,
          variant_index: i,
          label: `Variant ${i + 1}`,
          mime_type: "image/png",
          size_bytes: finalBuffer.length,
          width,
          height,
          storage_key: storageKey,
          storage_provider: "supabase",
        })

      if (insertError) {
        console.error("Insert error:", insertError)
        throw new Error(`Failed to save output ${i + 1}: ${insertError.message}`)
      }
    }

    // Update job to succeeded
    await supabase
      .from("generation_jobs")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId)

    return NextResponse.json({ success: true, outputs: generatedImages.length })
  } catch (error: any) {
    console.error("Generation error:", error)

    // Update job to failed
    const supabase = await createClient()
    const { jobId } = await params
    await supabase
      .from("generation_jobs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: error.message || "Unknown error",
        error_code: "GENERATION_ERROR",
      })
      .eq("id", jobId)

    return NextResponse.json(
      { error: error.message || "Generation failed" },
      { status: 500 }
    )
  }
}
