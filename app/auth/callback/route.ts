import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

/**
 * Get the base URL for redirects
 * Uses the request host or environment variable
 */
function getBaseUrl(request: NextRequest): string {
  // Use environment variable if available (for production)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  
  // Fallback to request URL (works in both dev and production)
  const protocol = request.headers.get("x-forwarded-proto") || "https"
  const host = request.headers.get("host") || request.nextUrl.host
  return `${protocol}://${host}`
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/reset-password"

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successfully exchanged code for session, redirect to next page
      const baseUrl = getBaseUrl(request)
      const redirectUrl = next.startsWith("http") ? next : `${baseUrl}${next}`
      return NextResponse.redirect(redirectUrl)
    }
  }

  // If there's an error or no code, redirect to login with error
  const baseUrl = getBaseUrl(request)
  return NextResponse.redirect(
    `${baseUrl}/login?error=Could not authenticate`
  )
}
