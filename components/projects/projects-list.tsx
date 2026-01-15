"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Plus, Pencil, Trash2 } from "lucide-react"
import { CreateProjectDialog } from "./create-project-dialog"
import { EditProjectDialog } from "./edit-project-dialog"
import { DeleteProjectDialog } from "./delete-project-dialog"

interface Project {
  id: string
  title: string
  platform: string
  app_name: string | null
  updated_at: string
  created_at: string
}

interface ProjectsListProps {
  projects: Project[]
}

export function ProjectsList({ projects: initialProjects }: ProjectsListProps) {
  const [mounted, setMounted] = useState(false)
  const [projects, setProjects] = useState(initialProjects)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleProjectCreated = (newProject: Project) => {
    setProjects([newProject, ...projects])
  }

  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects(
      projects.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    )
  }

  const handleProjectDeleted = (projectId: string) => {
    setProjects(projects.filter((p) => p.id !== projectId))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {mounted ? (
          <CreateProjectDialog onCreated={handleProjectCreated}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </CreateProjectDialog>
        ) : (
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">No projects yet</p>
          {mounted ? (
            <CreateProjectDialog onCreated={handleProjectCreated}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create your first project
              </Button>
            </CreateProjectDialog>
          ) : (
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Create your first project
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>App Name</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link
                      href={`/app/projects/${project.id}`}
                      className="font-medium hover:underline"
                    >
                      {project.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{project.platform}</Badge>
                  </TableCell>
                  <TableCell>{project.app_name || "-"}</TableCell>
                  <TableCell>
                    {new Date(project.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {mounted ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingProject(project)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingProject(project)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button variant="ghost" size="icon" disabled>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {mounted && editingProject && (
        <EditProjectDialog
          project={editingProject}
          open={!!editingProject}
          onOpenChange={(open) => !open && setEditingProject(null)}
          onUpdated={handleProjectUpdated}
        />
      )}

      {mounted && deletingProject && (
        <DeleteProjectDialog
          project={deletingProject}
          open={!!deletingProject}
          onOpenChange={(open) => !open && setDeletingProject(null)}
          onDeleted={handleProjectDeleted}
        />
      )}
    </div>
  )
}
