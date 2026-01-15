"use server"

import { createClient } from "@/lib/supabase/server"
import sharp from "sharp"
import { generateImagesWithGoogle } from "@/lib/ai/google-imagen-client"

interface ProcessJobParams {
  jobId: string
  projectId: string
  userId: string
  prompt: string
  model: "nano" | "banana"
  targetStore: string
  numVariations: number
  assetIds?: string[]
}

export async function processGenerationJob(params: ProcessJobParams) {
  const supabase = await createClient()
  
  try {
    // 1. Actualizar job a "running"
    const { error: updateError } = await supabase
      .from("generation_jobs")
      .update({ 
        status: "running",
        started_at: new Date().toISOString()
      })
      .eq("id", params.jobId)

    if (updateError) throw updateError

    // 2. Obtener assets si existen
    const assets = params.assetIds && params.assetIds.length > 0
      ? await getJobAssets(params.assetIds, supabase)
      : []

    // 3. Construir prompt mejorado
    const enhancedPrompt = buildEnhancedPrompt(
      params.prompt,
      params.targetStore,
      assets
    )

    // 4. Llamar a Google Imagen API
    const { images: generatedImages } = await generateImagesWithGoogle({
      prompt: enhancedPrompt,
      model: params.model,
      numVariations: params.numVariations,
      aspectRatio: getAspectRatio(params.targetStore),
      targetStore: params.targetStore,
    })

    // 5. Para cada imagen generada:
    for (let i = 0; i < generatedImages.length; i++) {
      const imageData = generatedImages[i]
      
      // La imagen puede venir como base64 o URL
      let imageBuffer: Buffer
      
      if (typeof imageData === "string") {
        if (imageData.startsWith("data:image")) {
          // Base64 data URL
          const base64Data = imageData.split(",")[1]
          imageBuffer = Buffer.from(base64Data, "base64")
        } else if (imageData.startsWith("http")) {
          // URL externa
          const response = await fetch(imageData)
          const arrayBuffer = await response.arrayBuffer()
          imageBuffer = Buffer.from(arrayBuffer)
        } else {
          // Base64 directo
          imageBuffer = Buffer.from(imageData, "base64")
        }
      } else {
        // Ya es un Buffer
        imageBuffer = imageData
      }

      // Obtener dimensiones de la imagen
      const metadata = await sharp(imageBuffer).metadata()
      const width = metadata.width || 1024
      const height = metadata.height || 1024
      const sizeBytes = imageBuffer.length

      // Subir a Supabase Storage
      const outputId = crypto.randomUUID()
      const storageKey = `projects/${params.projectId}/outputs/${outputId}.png`
      
      // Convertir a PNG y redimensionar según store
      let finalImageBuffer: Buffer
      let finalWidth: number
      let finalHeight: number
      
      if (params.targetStore === "ios") {
        // iOS: 1024x1024px cuadrado
        finalWidth = 1024
        finalHeight = 1024
        finalImageBuffer = await sharp(imageBuffer)
          .resize(1024, 1024, { fit: "cover", position: "center" })
          .png()
          .toBuffer()
      } else if (params.targetStore === "android") {
        // Android: 1024x500px feature graphic
        finalWidth = 1024
        finalHeight = 500
        finalImageBuffer = await sharp(imageBuffer)
          .resize(1024, 500, { fit: "cover", position: "center" })
          .png()
          .toBuffer()
      } else {
        // Mantener proporciones pero convertir a PNG
        const metadata = await sharp(imageBuffer).metadata()
        finalWidth = metadata.width || 1024
        finalHeight = metadata.height || 1024
        finalImageBuffer = await sharp(imageBuffer).png().toBuffer()
      }

      const { error: uploadError } = await supabase.storage
        .from("app-covers")
        .upload(storageKey, finalImageBuffer, {
          contentType: "image/png",
          upsert: false,
        })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw new Error(`Failed to upload output ${i + 1}: ${uploadError.message}`)
      }

      // Insertar en generated_outputs
      const { error: insertError } = await supabase
        .from("generated_outputs")
        .insert({
          id: outputId,
          job_id: params.jobId,
          project_id: params.projectId,
          user_id: params.userId,
          variant_index: i,
          label: `Variant ${i + 1}`,
          mime_type: "image/png",
          size_bytes: finalImageBuffer.length,
          width: finalWidth,
          height: finalHeight,
          storage_key: storageKey,
          storage_provider: "supabase",
          checksum_sha256: null,
        })

      if (insertError) {
        console.error("Insert error:", insertError)
        throw insertError
      }
    }

    // 6. Actualizar job a "succeeded"
    await supabase
      .from("generation_jobs")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
      })
      .eq("id", params.jobId)

    return { success: true }
  } catch (error: any) {
    console.error("Generation error:", error)
    
    // 7. Si falla, actualizar job a "failed"
    await supabase
      .from("generation_jobs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: error.message || "Unknown error",
        error_code: "GENERATION_ERROR",
      })
      .eq("id", params.jobId)

    throw error
  }
}

async function getJobAssets(assetIds: string[], supabase: any) {
  const { data, error } = await supabase
    .from("assets")
    .select("id, type, storage_key, original_filename")
    .in("id", assetIds)
    .is("deleted_at", null)

  if (error || !data) return []

  // Obtener URLs firmadas
  const assetsWithUrls = await Promise.all(
    data.map(async (asset: any) => {
      if (asset.storage_key) {
        const { data: urlData } = await supabase.storage
          .from("app-covers")
          .createSignedUrl(asset.storage_key, 3600)
        return {
          ...asset,
          url: urlData?.signedUrl
        }
      }
      return asset
    })
  )

  return assetsWithUrls
}

function buildEnhancedPrompt(
  userPrompt: string,
  targetStore: string,
  assets: any[]
) {
  let prompt = userPrompt

  // Agregar contexto del store
  if (targetStore === "ios") {
    prompt += ". iOS App Store cover style: minimal, clean, modern design with elegant typography. Square format 1024x1024px. Professional, sophisticated aesthetic."
  } else if (targetStore === "android") {
    prompt += ". Google Play Store feature graphic style: vibrant, colorful, engaging design. Wide banner format 1024x500px. Eye-catching and dynamic."
  } else {
    prompt += ". App store cover design: professional and modern."
  }

  // Agregar referencia a assets
  if (assets.length > 0) {
    const referenceCovers = assets.filter((a: any) => a.type === "reference_cover")
    const appScreenshots = assets.filter((a: any) => a.type === "app_screenshot")
    const brandLogos = assets.filter((a: any) => a.type === "brand_logo")
    
    if (referenceCovers.length > 0) {
      prompt += ` Use similar style and color palette as the provided reference covers.`
    }
    if (appScreenshots.length > 0) {
      prompt += ` Incorporate visual elements and color scheme from the app screenshots.`
    }
    if (brandLogos.length > 0) {
      prompt += ` Include brand identity and colors from the brand logos.`
    }
  }

  // Asegurar calidad profesional
  prompt += " High quality, professional app store cover design. No text overlays, clean background."

  return prompt
}

function getAspectRatio(targetStore: string): string {
  if (targetStore === "ios") return "1:1" // Square
  if (targetStore === "android") return "1024:500" // Wide banner
  return "1:1"
}


