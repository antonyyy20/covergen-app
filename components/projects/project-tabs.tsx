"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AssetsTab } from "./assets-tab"
import { JobsTab } from "./jobs-tab"
import { OutputsTab } from "./outputs-tab"

interface ProjectTabsProps {
  projectId: string
}

export function ProjectTabs({ projectId }: ProjectTabsProps) {
  return (
    <Tabs defaultValue="assets" className="space-y-4">
      <TabsList>
        <TabsTrigger value="assets">Assets</TabsTrigger>
        <TabsTrigger value="jobs">Generations</TabsTrigger>
        <TabsTrigger value="outputs">Outputs</TabsTrigger>
      </TabsList>
      <TabsContent value="assets">
        <AssetsTab projectId={projectId} />
      </TabsContent>
      <TabsContent value="jobs">
        <JobsTab projectId={projectId} />
      </TabsContent>
      <TabsContent value="outputs">
        <OutputsTab projectId={projectId} />
      </TabsContent>
    </Tabs>
  )
}
