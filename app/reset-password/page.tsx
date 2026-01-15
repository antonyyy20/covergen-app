"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Sparkles, ArrowLeft } from "lucide-react"

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isExchangingCode, setIsExchangingCode] = useState(true)
  const [codeError, setCodeError] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // Check if user is authenticated when page loads
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verify user is authenticated (code should have been exchanged by /auth/callback)
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          setCodeError("Session expired or invalid. Please request a new reset link.")
          setIsExchangingCode(false)
          return
        }
        
        setIsExchangingCode(false)
      } catch (error: any) {
        console.error("Reset password error:", error)
        setCodeError(error.message || "Failed to verify session")
        setIsExchangingCode(false)
      }
    }

    checkAuth()
  }, [supabase])

  const onSubmit = async (data: ResetPasswordForm) => {
    if (codeError) {
      toast.error(codeError)
      return
    }

    setIsLoading(true)
    try {
      // Verify user is still authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error("Session expired. Please request a new reset link.")
      }

      // Update password (user must be authenticated)
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (updateError) throw updateError

      toast.success("Password updated successfully! You can now sign in with your new password.")
      router.push("/login")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isExchangingCode ? (
            <div className="text-center py-8 text-muted-foreground">
              Verifying reset link...
            </div>
          ) : codeError ? (
            <div className="space-y-4">
              <div className="text-center text-sm text-destructive">
                {codeError}
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push("/forgot-password")}
              >
                Request New Reset Link
              </Button>
              <div className="text-center text-sm">
                <Link href="/login" className="text-primary hover:underline flex items-center justify-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
          {!isExchangingCode && !codeError && (
            <div className="mt-4 text-center text-sm">
              <Link href="/login" className="text-primary hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back to Sign in
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
