/**
 * Gemini API Client for Image Generation
 * Uses ONLY Gemini API with GOOGLE_API_KEY
 * No Imagen, no Vertex AI, no service accounts
 */

interface GenerateImageParams {
  prompt: string
  model: "nano" | "banana" | "pro"
  numVariations: number
  aspectRatio: string
  referenceImages?: Array<{
    mimeType: string
    data: string // base64
  }>
  screenshots?: Array<{
    mimeType: string
    data: string // base64
  }>
}

interface GeneratedImage {
  data: string // base64
  mimeType: string
}

/**
 * Get Gemini model ID
 * Map user model names (nano/banana/pro) to actual Gemini model IDs
 * 
 * Using gemini-2.5-flash-image for all models as specified
 */
function getGeminiModelId(model: "nano" | "banana" | "pro"): string {
  // All models use gemini-2.5-flash-image for image generation
  return "gemini-2.5-flash-image"
}

/**
 * Generate images using Gemini API only
 * Endpoint: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 */
export async function generateImagesWithGemini(
  params: GenerateImageParams
): Promise<GeneratedImage[]> {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY environment variable is not set. " +
      "Please add GOOGLE_API_KEY to your .env.local file."
    )
  }

  const modelId = getGeminiModelId(params.model)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`

  // Build parts array for multimodal input
  const parts: any[] = []

  // Add reference images first (for style inspiration)
  if (params.referenceImages && params.referenceImages.length > 0) {
    for (const refImage of params.referenceImages) {
      parts.push({
        inlineData: {
          mimeType: refImage.mimeType,
          data: refImage.data,
        },
      })
    }
  }

  // Add screenshots (for content reference)
  if (params.screenshots && params.screenshots.length > 0) {
    for (const screenshot of params.screenshots) {
      parts.push({
        inlineData: {
          mimeType: screenshot.mimeType,
          data: screenshot.data,
        },
      })
    }
  }

  // Build enhanced prompt with aspect ratio and style instructions
  let enhancedPrompt = params.prompt
  
  // Add aspect ratio instructions
  if (params.aspectRatio === "1:1") {
    enhancedPrompt += " Square format, 1024x1024px. Perfect for App Store covers."
  } else if (params.aspectRatio === "1024:500") {
    enhancedPrompt += " Wide banner format, 1024x500px. Perfect for Play Store feature graphics."
  }

  enhancedPrompt += " High quality, professional app store cover design. No text overlays in the image itself."

  // Add text prompt
  parts.push({
    text: enhancedPrompt,
  })

  // Generate multiple images by making multiple requests
  const generatedImages: GeneratedImage[] = []

  for (let i = 0; i < params.numVariations; i++) {
    try {
      const url = `${endpoint}?key=${apiKey}`

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts,
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        let errorText = ""

        if (contentType?.includes("application/json")) {
          try {
            const errorData = await response.json()
            errorText = JSON.stringify(errorData)
          } catch {
            errorText = await response.text()
          }
        } else {
          errorText = await response.text()
          if (errorText.includes("<!DOCTYPE") || errorText.includes("<html")) {
            errorText = `API returned HTML instead of JSON. Status: ${response.status}. This usually means the endpoint doesn't exist or the model is not available.`
          }
        }

        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 500)}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType?.includes("application/json")) {
        const text = await response.text()
        if (text.includes("<!DOCTYPE") || text.includes("<html")) {
          throw new Error(
            `API returned HTML instead of JSON. The endpoint "${endpoint}" may not exist or the model "${modelId}" is not available.`
          )
        }
        throw new Error(`Expected JSON but got ${contentType}`)
      }

      const data = await response.json()

      // Extract images from Gemini response
      if (data.candidates && Array.isArray(data.candidates)) {
        for (const candidate of data.candidates) {
          if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData && part.inlineData.mimeType?.startsWith("image/")) {
                generatedImages.push({
                  data: part.inlineData.data,
                  mimeType: part.inlineData.mimeType,
                })
              }
            }
          }
        }
      }

      // If no images in this response, log warning but continue
      if (generatedImages.length === i) {
        console.warn(`No images returned in variation ${i + 1}`)
      }
    } catch (error: any) {
      console.error(`Error generating image variation ${i + 1}:`, error)
      // Continue with next variation instead of failing completely
      if (i === 0) {
        // If first variation fails, throw error
        throw new Error(
          `Failed to generate images with Gemini API (model: ${modelId}): ${error.message}`
        )
      }
    }
  }

  if (generatedImages.length === 0) {
    throw new Error(
      `Gemini API did not return any images. ` +
      `Model: ${modelId}. ` +
      `This may mean the model doesn't support image generation or the prompt needs adjustment.`
    )
  }

  return generatedImages
}
