import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProjectTabs } from "@/components/projects/project-tabs"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }> | { projectId: string }
}) {
  // Handle both Next.js 15+ (Promise) and older versions
  const { projectId } = await (typeof params === "object" && "then" in params ? params : Promise.resolve(params))
  
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single()

  if (!project) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">{project.title}</h1>
          <Badge variant="outline">{project.platform}</Badge>
        </div>
        {project.app_name && (
          <p className="text-muted-foreground">App: {project.app_name}</p>
        )}
        {project.locale && (
          <p className="text-sm text-muted-foreground">Locale: {project.locale}</p>
        )}
      </div>

      {project.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {project.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <ProjectTabs projectId={projectId} />
    </div>
  )
}
