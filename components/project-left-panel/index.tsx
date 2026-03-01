"use client"

import { useProject } from "@/src/hooks/use-project"

export function ProjectLeftPanel() {
  const { project } = useProject()

  return (
    <div>
      <div className="w-full border-b p-6">
        <h1 className="text-2xl font-bold">{project.name}</h1>
      </div>
    </div>
  )
}
