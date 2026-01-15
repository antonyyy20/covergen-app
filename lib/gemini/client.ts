/**
 * Google Gemini Client for Prompt Enhancement
 * Server-only: Never expose API keys to client
 * 
 * NOTE: Gemini does NOT generate images - it only analyzes them.
 * Use this client to enhance prompts based on reference images.
 * For actual image generation, use Google Imagen API, DALL-E, or another service.
 */

import { GoogleGenerativeAI } from "@google/generative-ai"

let genAI: GoogleGenerativeAI | null = null

function getGeminiClient(): GoogleGenerativeAI {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error(
      "GOOGLE_API_KEY environment variable is not set. " +
      "Add GOOGLE_API_KEY to your .env.local file to use Gemini for prompt enhancement."
    )
  }
  
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  }
  
  return genAI
}

/**
 * Use Gemini to generate enhanced image generation prompts
 * This analyzes the user's request and creates a detailed prompt for image generation services
 */
export async function generateImagePrompt(
  userPrompt: string,
  context?: string,
  referenceImages?: Array<{ mimeType: string; data: string }>
): Promise<string> {
  try {
    const client = getGeminiClient()
    // Use gemini-1.5-flash for text generation (faster and available)
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" })

    const parts: any[] = []

    // Add reference images if provided
    if (referenceImages && referenceImages.length > 0) {
      for (const refImage of referenceImages) {
        parts.push({
          inlineData: {
            mimeType: refImage.mimeType,
            data: refImage.data,
          },
        })
      }
    }

    // Add text prompt
    const promptText = `You are an expert at creating detailed image generation prompts for app store covers.

User request: ${userPrompt}
${context ? `Context: ${context}` : ""}

Create a detailed, specific prompt for generating an app store cover image. Include:
- Visual style and aesthetic
- Color palette
- Layout and composition
- Typography style (if any)
- Mood and tone
- Technical specifications (dimensions, format)

Return only the prompt, no explanations.`

    parts.push({ text: promptText })

    const result = await model.generateContent({ contents: [{ role: "user", parts }] })
    const response = result.response
    return response.text()
  } catch (error: any) {
    console.error("Gemini prompt generation error:", error)
    throw new Error(`Failed to generate prompt: ${error.message}`)
  }
}
