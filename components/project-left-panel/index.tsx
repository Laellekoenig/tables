"use client"

import { useProject } from "@/src/hooks/use-project"
import { ProjectLeftPanelForm } from "./project-left-panel-form"
import { ProjectLeftPanelProvider } from "./project-left-panel-provider"
import { ProjectLeftPanelTransformations } from "./project-left-panel-transformations"

export function ProjectLeftPanel() {
  const { project } = useProject()

  return (
    <ProjectLeftPanelProvider>
      <div>
        <div className="w-full border-b p-6">
          <h1 className="text-2xl font-bold">{project.name}</h1>
        </div>

        <ProjectLeftPanelForm />

        <div className="p-6">
          <ProjectLeftPanelTransformations />
        </div>
      </div>
    </ProjectLeftPanelProvider>
  )
}
