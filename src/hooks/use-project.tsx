"use client"

import { createContext, useContext } from "react"
import { type Project } from "@/src/server/get-project"
import { type ParsedCsv } from "@/src/lib/csv-parsing"
import { type TransformationTree } from "@/src/server/transformation-helpers"

export interface ProjectContextValue {
  project: Project
  csv: ParsedCsv
  transformationTree: TransformationTree[]
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({
  project,
  csv,
  transformationTree,
  children,
}: {
  project: Project
  csv: ParsedCsv
  transformationTree: TransformationTree[]
  children: React.ReactNode
}) {
  return (
    <ProjectContext.Provider value={{ project, csv, transformationTree }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider")
  }
  return context
}
