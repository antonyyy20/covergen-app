/**
 * Cliente para Google Imagen API
 * Maneja las diferentes formas de llamar a la API de generación de imágenes de Google
 */

interface GenerateImageParams {
  prompt: string
  model: "nano" | "banana"
  numVariations: number
  aspectRatio: string
  targetStore: string
}

interface ImageResponse {
  images: string[] // URLs o base64 data URLs
  model: string
}

/**
 * Genera imágenes usando Google Imagen API
 * Intenta múltiples endpoints y formatos hasta encontrar uno que funcione
 */
export async function generateImagesWithGoogle(
  params: GenerateImageParams
): Promise<ImageResponse> {
  const apiKey = process.env.GOOGLE_IMAGEN_API_KEY || process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error(
      "GOOGLE_IMAGEN_API_KEY or GEMINI_API_KEY not configured. " +
      "Please add one of these to your .env.local file. " +
      "See GOOGLE_SETUP.md for instructions."
    )
  }

  const modelName = params.model === "nano"
    ? "imagen-3.0-generate-001" // Fast model
    : "imagen-3.0-generate-002" // Ultra/high quality model

  // Construir prompt mejorado
  const enhancedPrompt = buildPromptWithStyle(params.prompt, params.targetStore)

  // Intentar diferentes endpoints
  const endpoints = [
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateImages`,
      body: {
        prompt: enhancedPrompt,
        number_of_images: params.numVariations,
        aspect_ratio: params.aspectRatio,
        safety_filter_level: "block_some",
      },
    },
    // Vertex AI format si está configurado
    ...(process.env.GOOGLE_CLOUD_PROJECT_ID
      ? [
          {
            url: `https://${process.env.GOOGLE_CLOUD_LOCATION || "us-central1"}-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/${process.env.GOOGLE_CLOUD_LOCATION || "us-central1"}/publishers/google/models/${modelName}:predict`,
            body: {
              instances: [
                {
                  prompt: enhancedPrompt,
                  number_of_images: params.numVariations,
                  aspect_ratio: params.aspectRatio,
                },
              ],
              parameters: {
                sampleCount: params.numVariations,
              },
            },
          },
        ]
      : []),
  ]

  let lastError: Error | null = null

  for (const endpoint of endpoints) {
    try {
      const url = endpoint.url.includes("?") 
        ? `${endpoint.url}&key=${apiKey}`
        : `${endpoint.url}?key=${apiKey}`

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(endpoint.body),
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
          // If it's HTML, extract meaningful error
          if (errorText.includes("<!DOCTYPE") || errorText.includes("<html")) {
            errorText = `API returned HTML instead of JSON. Status: ${response.status}. This usually means the endpoint doesn't exist or requires different authentication.`
          }
        }
        
        lastError = new Error(`HTTP ${response.status}: ${errorText.substring(0, 300)}`)
        continue
      }

      const contentType = response.headers.get("content-type")
      if (!contentType?.includes("application/json")) {
        const text = await response.text()
        if (text.includes("<!DOCTYPE") || text.includes("<html")) {
          lastError = new Error(
            `API returned HTML instead of JSON. This usually means:\n` +
            `1. The endpoint URL is incorrect\n` +
            `2. The API key is invalid\n` +
            `3. The API is not available in your region\n` +
            `4. The model name is incorrect\n\n` +
            `Response preview: ${text.substring(0, 200)}`
          )
          continue
        }
        lastError = new Error(`Expected JSON but got ${contentType}`)
        continue
      }

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        const text = await response.text()
        lastError = new Error(`Failed to parse JSON response: ${text.substring(0, 200)}`)
        continue
      }
      
      const images = extractImagesFromResponse(data)

      if (images.length > 0) {
        return {
          images,
          model: modelName,
        }
      }
    } catch (error: any) {
      lastError = error
      continue
    }
  }

  // Si llegamos aquí, todos los endpoints fallaron
  throw new Error(
    `Failed to generate images with Google Imagen API. ` +
    `Tried ${endpoints.length} endpoint(s). ` +
    `Last error: ${lastError?.message || "Unknown error"}. ` +
    `Please verify your API key and check GOOGLE_SETUP.md for configuration help.`
  )
}

function buildPromptWithStyle(userPrompt: string, targetStore: string): string {
  let prompt = userPrompt

  if (targetStore === "ios") {
    prompt += " iOS App Store cover style: minimal, clean, modern design with elegant typography. Square format. Professional, sophisticated aesthetic. High quality app store cover."
  } else if (targetStore === "android") {
    prompt += " Google Play Store feature graphic style: vibrant, colorful, engaging design. Wide banner format 1024x500px. Eye-catching and dynamic. High quality play store feature graphic."
  }

  return prompt
}

function extractImagesFromResponse(data: any): string[] {
  const images: string[] = []

  // Formato 1: generatedImages array
  if (data.generatedImages && Array.isArray(data.generatedImages)) {
    for (const img of data.generatedImages) {
      if (img.imageUri) images.push(img.imageUri)
      else if (img.base64) images.push(`data:image/png;base64,${img.base64}`)
      else if (img.url) images.push(img.url)
      else if (img.bytesBase64Encoded) {
        images.push(`data:image/png;base64,${img.bytesBase64Encoded}`)
      }
    }
  }

  // Formato 2: predictions (Vertex AI)
  if (data.predictions && Array.isArray(data.predictions)) {
    for (const pred of data.predictions) {
      if (pred.bytesBase64Encoded) {
        images.push(`data:image/png;base64,${pred.bytesBase64Encoded}`)
      } else if (pred.imageUri) {
        images.push(pred.imageUri)
      } else if (pred.base64) {
        images.push(`data:image/png;base64,${pred.base64}`)
      }
    }
  }

  // Formato 3: respuesta directa
  if (data.imageUri && typeof data.imageUri === "string") {
    images.push(data.imageUri)
  }
  if (data.url && typeof data.url === "string") {
    images.push(data.url)
  }
  if (data.base64 && typeof data.base64 === "string") {
    images.push(`data:image/png;base64,${data.base64}`)
  }

  // Formato 4: candidates (Gemini style)
  if (data.candidates && Array.isArray(data.candidates)) {
    for (const candidate of data.candidates) {
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData?.mimeType?.startsWith("image/")) {
            images.push(
              `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            )
          }
        }
      }
    }
  }

  return images
}
