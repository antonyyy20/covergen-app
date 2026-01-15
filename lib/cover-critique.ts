/**
 * Cover Critique System
 * Rule-based analysis of cover design configuration
 */

import type { JobConfig } from "./prompt-builder"

export interface CritiqueIssue {
  severity: "error" | "warning" | "info"
  category: "assets" | "layout" | "content" | "style" | "technical"
  message: string
  suggestion?: string
}

export interface CritiqueResult {
  score: number // 0-100
  issues: CritiqueIssue[]
  summary: string
}

/**
 * Analyze job configuration and provide critique
 */
export function critiqueCoverConfig(
  config: JobConfig,
  assetCounts: {
    referenceCovers: number
    screenshots: number
    logos: number
  }
): CritiqueResult {
  const issues: CritiqueIssue[] = []
  let score = 100

  // Check required assets
  if (assetCounts.referenceCovers === 0) {
    issues.push({
      severity: "error",
      category: "assets",
      message: "No reference covers selected",
      suggestion: "Add at least one reference cover for style inspiration",
    })
    score -= 20
  }

  if (assetCounts.screenshots < 2) {
    issues.push({
      severity: "warning",
      category: "assets",
      message: `Only ${assetCounts.screenshots} screenshot(s) selected`,
      suggestion: "Consider adding 2-3 screenshots for better content representation",
    })
    score -= 10
  }

  // Check variant selection
  const enabledVariants = config.variants.filter((v) => v.enabled)
  if (enabledVariants.length === 0) {
    issues.push({
      severity: "error",
      category: "layout",
      message: "No variants enabled",
      suggestion: "Enable at least one variant to generate covers",
    })
    score -= 30
  }

  if (enabledVariants.length > 4) {
    issues.push({
      severity: "warning",
      category: "layout",
      message: `${enabledVariants.length} variants enabled`,
      suggestion: "Consider generating 2-4 variants for better focus",
    })
    score -= 5
  }

  // Check main message
  if (!config.mainMessage || config.mainMessage.trim().length < 5) {
    issues.push({
      severity: "warning",
      category: "content",
      message: "Main message is too short or missing",
      suggestion: "Add a clear value proposition (5-15 words)",
    })
    score -= 10
  }

  if (config.mainMessage && config.mainMessage.length > 50) {
    issues.push({
      severity: "info",
      category: "content",
      message: "Main message is quite long",
      suggestion: "Keep value propositions concise for better readability",
    })
    score -= 5
  }

  // Check style and goal alignment
  if (config.goal === "premium" && config.stylePreset === "neon-gaming") {
    issues.push({
      severity: "warning",
      category: "style",
      message: "Style mismatch: Premium goal with gaming style",
      suggestion: "Consider 'Minimal' or 'Modern SaaS' style for premium feel",
    })
    score -= 10
  }

  if (config.goal === "playful" && config.stylePreset === "corporate-trust") {
    issues.push({
      severity: "warning",
      category: "style",
      message: "Style mismatch: Playful goal with corporate style",
      suggestion: "Consider 'Bold Gradient' or 'Neon Gaming' style for playful feel",
    })
    score -= 10
  }

  // Check screenshot count vs variant type
  if (assetCounts.screenshots > 5) {
    issues.push({
      severity: "info",
      category: "layout",
      message: "Many screenshots selected",
      suggestion: "Too many screenshots may create clutter. Consider 2-4 for best results",
    })
    score -= 5
  }

  // Check target store specificity
  if (config.targetStore === "both") {
    issues.push({
      severity: "info",
      category: "technical",
      message: "Generating for both stores",
      suggestion: "Consider generating separate covers for each store for optimal results",
    })
    // Don't reduce score, this is just informational
  }

  // Generate summary
  const errorCount = issues.filter((i) => i.severity === "error").length
  const warningCount = issues.filter((i) => i.severity === "warning").length

  let summary = ""
  if (score >= 90) {
    summary = "Excellent configuration! Ready to generate high-quality covers."
  } else if (score >= 70) {
    summary = "Good configuration with minor improvements suggested."
  } else if (score >= 50) {
    summary = "Configuration needs attention. Review warnings before generating."
  } else {
    summary = "Configuration has critical issues. Please fix errors before generating."
  }

  if (errorCount > 0) {
    summary += ` ${errorCount} error(s) must be fixed.`
  }
  if (warningCount > 0) {
    summary += ` ${warningCount} warning(s) to consider.`
  }

  return {
    score: Math.max(0, score),
    issues,
    summary,
  }
}
