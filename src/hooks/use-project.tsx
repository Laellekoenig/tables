"use client"

import { createContext, useContext } from "react"
import { type Project } from "@/src/server/get-project"
import { type ParsedCsv } from "@/src/lib/csv-parsing"

export interface ProjectContextValue {
  project: Project
  csv: ParsedCsv
  displayedCsv: ParsedCsv
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({
  project,
  csv,
  children,
}: {
  project: Project
  csv: ParsedCsv
  children: React.ReactNode
}) {
  return (
    <ProjectContext.Provider
      value={{
        project,
        csv,
        displayedCsv: csv,
      }}
    >
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
