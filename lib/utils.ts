import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the base URL for the application
 * Always prioritizes NEXT_PUBLIC_APP_URL environment variable
 * Falls back to window.location.origin on client, or production URL on server
 * 
 * IMPORTANT: For production, always set NEXT_PUBLIC_APP_URL in Vercel environment variables
 */
export function getAppUrl(): string {
  // Always check environment variable first (works in both client and server)
  // In Next.js, NEXT_PUBLIC_* variables are available on both client and server
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  
  if (envUrl) {
    // Remove trailing slash if present
    return envUrl.replace(/\/$/, "")
  }
  
  if (typeof window !== "undefined") {
    // Client-side fallback: use current origin
    // WARNING: This will be localhost in development
    // Make sure NEXT_PUBLIC_APP_URL is set in production!
    const origin = window.location.origin
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      console.warn(
        "⚠️ NEXT_PUBLIC_APP_URL is not set. Using localhost. " +
        "For production, set NEXT_PUBLIC_APP_URL in Vercel environment variables."
      )
    }
    return origin
  }
  
  // Server-side fallback: default to production URL
  // This should only happen if NEXT_PUBLIC_APP_URL is not set (bad configuration)
  console.warn(
    "⚠️ NEXT_PUBLIC_APP_URL is not set on server. " +
    "Defaulting to production URL. Set NEXT_PUBLIC_APP_URL in environment variables."
  )
  return "https://covergen-app.vercel.app"
}
