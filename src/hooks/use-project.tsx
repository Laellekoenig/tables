"use client"

import { createContext, useContext, useState } from "react"
import { err, ok, type Result } from "neverthrow"
import { parseCsv, type ParsedCsv } from "@/src/lib/csv-parsing"
import { type Project } from "@/src/server/get-project"

export interface ProjectContextValue {
  project: Project
  csv: ParsedCsv
  displayedCsv: ParsedCsv
  setDisplayedCsvFromText: (csvText: string) => Result<void, string>
  resetDisplayedCsv: () => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({
  project,
  csv,
  csvText,
  children,
}: {
  project: Project
  csv: ParsedCsv
  csvText: string
  children: React.ReactNode
}) {
  const [displayedCsv, setDisplayedCsv] = useState<ParsedCsv>(csv)
  const [displayedCsvText, setDisplayedCsvText] = useState(csvText)

  return (
    <ProjectContext.Provider
      value={{
        project,
        csv,
        displayedCsv,
        setDisplayedCsvFromText: csvText => {
          if (csvText === displayedCsvText) {
            return ok(undefined)
          }

          const parsedCsvResult = parseCsv(csvText)

          if (parsedCsvResult.isErr()) {
            return err(parsedCsvResult.error)
          }

          setDisplayedCsv(parsedCsvResult.value)
          setDisplayedCsvText(csvText)
          return ok(undefined)
        },
        resetDisplayedCsv: () => {
          if (displayedCsvText === csvText) {
            return
          }

          setDisplayedCsv(csv)
          setDisplayedCsvText(csvText)
        },
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
