import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProjectsList } from "@/components/projects/projects-list"

export default async function ProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, platform, app_name, updated_at, created_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your app store cover generation projects
          </p>
        </div>
      </div>
      <ProjectsList projects={projects || []} />
    </div>
  )
}
