"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut } from "lucide-react"
import { toast } from "sonner"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface TopBarProps {
  user: SupabaseUser
  profile: { name?: string; email?: string; role?: string } | null
}

export function TopBar({ user, profile }: TopBarProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const response = await fetch("/auth/logout", { method: "POST" })
      if (response.ok) {
        toast.success("Logged out successfully")
        router.push("/login")
        router.refresh()
      }
    } catch (error) {
      toast.error("Failed to logout")
    }
  }

  return (
    <header className="h-16 border-b bg-background flex items-center justify-end px-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span className="hidden sm:inline">
              {profile?.name || user.email?.split("@")[0]}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{profile?.name || "User"}</p>
              <p className="text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
