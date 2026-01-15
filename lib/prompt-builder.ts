/**
 * Prompt Builder for App Store Cover Generation
 * Creates structured, high-quality prompts based on wizard configuration
 */

export interface StylePreset {
  id: string
  name: string
  description: string
  contrast: "low" | "medium" | "high"
  density: "sparse" | "balanced" | "dense"
  tone: "professional" | "playful" | "premium" | "energetic" | "calm"
  layoutRules: string[]
}

export const STYLE_PRESETS: Record<string, StylePreset> = {
  minimal: {
    id: "minimal",
    name: "Minimal / Apple-like",
    description: "Clean, spacious design with lots of whitespace",
    contrast: "low",
    density: "sparse",
    tone: "premium",
    layoutRules: [
      "Single focal point",
      "Generous whitespace (40%+ of canvas)",
      "Subtle gradients or solid colors",
      "Minimal or no text",
      "One primary element",
    ],
  },
  "bold-gradient": {
    id: "bold-gradient",
    name: "Bold Gradient",
    description: "Vibrant gradients with strong visual impact",
    contrast: "high",
    density: "balanced",
    tone: "energetic",
    layoutRules: [
      "Bold gradient backgrounds",
      "High contrast elements",
      "Dynamic composition",
      "Vibrant color palette",
      "Modern, eye-catching design",
    ],
  },
  "neon-gaming": {
    id: "neon-gaming",
    name: "Neon Gaming",
    description: "Futuristic neon aesthetics for gaming apps",
    contrast: "high",
    density: "dense",
    tone: "energetic",
    layoutRules: [
      "Neon color accents",
      "Dark backgrounds",
      "Glowing effects",
      "Dynamic action elements",
      "Gaming aesthetic",
    ],
  },
  "corporate-trust": {
    id: "corporate-trust",
    name: "Corporate Trust",
    description: "Professional, trustworthy design for business apps",
    contrast: "medium",
    density: "balanced",
    tone: "professional",
    layoutRules: [
      "Professional color palette",
      "Clean typography",
      "Structured layout",
      "Trust-building elements",
      "Corporate aesthetic",
    ],
  },
  "modern-saas": {
    id: "modern-saas",
    name: "Modern SaaS",
    description: "Contemporary SaaS product aesthetic",
    contrast: "medium",
    density: "balanced",
    tone: "professional",
    layoutRules: [
      "Modern UI elements",
      "Soft shadows and depth",
      "Contemporary color schemes",
      "Product-focused composition",
      "SaaS aesthetic",
    ],
  },
}

export interface JobConfig {
  targetStore: "appstore" | "playstore" | "both"
  goal: "attention" | "clarity" | "trust" | "premium" | "playful"
  appCategory: string
  mainMessage: string
  stylePreset: string
  selectedAssets: Array<{
    assetId: string
    role: "reference_cover" | "app_screenshot" | "brand_logo"
  }>
  variants: Array<{
    id: string
    enabled: boolean
  }>
}

export interface AssetInfo {
  id: string
  type: "reference_cover" | "app_screenshot" | "brand_logo" | "other"
  original_filename: string
}

/**
 * Build a comprehensive prompt for cover generation
 */
export function buildCoverPrompt(
  config: JobConfig,
  assets: AssetInfo[]
): string {
  const preset = STYLE_PRESETS[config.stylePreset] || STYLE_PRESETS.minimal
  const referenceCovers = assets.filter(
    (a) =>
      config.selectedAssets.some(
        (sa) => sa.assetId === a.id && sa.role === "reference_cover"
      ) && a.type === "reference_cover"
  )
  const screenshots = assets.filter(
    (a) =>
      config.selectedAssets.some(
        (sa) => sa.assetId === a.id && sa.role === "app_screenshot"
      ) && a.type === "app_screenshot"
  )
  const logos = assets.filter(
    (a) =>
      config.selectedAssets.some(
        (sa) => sa.assetId === a.id && sa.role === "brand_logo"
      ) && a.type === "brand_logo"
  )

  // Base prompt structure
  let prompt = `Create a professional app store cover image for a ${config.appCategory} app. `

  // Goal-based instructions
  switch (config.goal) {
    case "attention":
      prompt += "Design should be eye-catching and grab immediate attention. "
      break
    case "clarity":
      prompt += "Design should clearly communicate the app's purpose and value. "
      break
    case "trust":
      prompt += "Design should convey professionalism and trustworthiness. "
      break
    case "premium":
      prompt += "Design should feel premium, sophisticated, and high-quality. "
      break
    case "playful":
      prompt += "Design should be fun, energetic, and engaging. "
      break
  }

  // Store-specific requirements
  if (config.targetStore === "appstore" || config.targetStore === "both") {
    prompt +=
      "iOS App Store style: Square format (1024x1024px), minimal and elegant design with clean typography. "
  }
  if (config.targetStore === "playstore" || config.targetStore === "both") {
    prompt +=
      "Google Play Store style: Feature graphic format (1024x500px), vibrant and engaging design. "
  }

  // Style preset instructions
  prompt += `${preset.name} style: ${preset.description}. `
  prompt += `Tone: ${preset.tone}. `
  prompt += `Contrast level: ${preset.contrast}. `
  prompt += `Visual density: ${preset.density}. `

  // Layout rules
  if (preset.layoutRules.length > 0) {
    prompt += `Layout guidelines: ${preset.layoutRules.join(", ")}. `
  }

  // Reference covers (style inspiration only)
  if (referenceCovers.length > 0) {
    prompt += `Use similar style, color palette, and aesthetic approach as the provided reference covers. `
  }

  // Screenshots (real content)
  if (screenshots.length > 0) {
    prompt += `Incorporate visual elements, UI components, and color scheme from the provided app screenshots. `
    if (screenshots.length === 1) {
      prompt += `Show one screenshot prominently. `
    } else if (screenshots.length === 2) {
      prompt += `Show two screenshots in a balanced composition. `
    } else {
      prompt += `Show ${screenshots.length} screenshots in an organized collage layout. `
    }
  }

  // Brand logos
  if (logos.length > 0) {
    prompt += `Include brand identity and colors from the provided brand logos. `
  }

  // Main message
  if (config.mainMessage) {
    prompt += `The cover should communicate: "${config.mainMessage}". `
  }

  // Technical requirements
  prompt +=
    "High quality, professional design. Ensure mobile readability, proper contrast, single focal point, and safe margins. "
  prompt += "No text overlays unless specifically requested. Clean background. "

  // Quality assurance
  prompt +=
    "The final image should be production-ready for app store submission. "

  return prompt.trim()
}

/**
 * Get aspect ratio for target store
 */
export function getAspectRatio(targetStore: "appstore" | "playstore" | "both"): {
  width: number
  height: number
  ratio: string
} {
  if (targetStore === "appstore") {
    return { width: 1024, height: 1024, ratio: "1:1" }
  }
  if (targetStore === "playstore") {
    return { width: 1024, height: 500, ratio: "1024:500" }
  }
  // Default to App Store format
  return { width: 1024, height: 1024, ratio: "1:1" }
}
