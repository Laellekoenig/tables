"use client"

import { createContext, useContext, useMemo } from "react"
import { type Project } from "@/src/server/get-project"
import { type ParsedCsv, parseCsv } from "@/src/lib/csv-parsing"
import {
  type Transformation,
  type TransformationTree,
} from "@/src/server/transformation-helpers"

export interface ProjectContextValue {
  project: Project
  csv: ParsedCsv
  displayedCsv: ParsedCsv
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
  const displayedCsv = useMemo(() => {
    const latestOutputCsv = getLatestCompletedOutputCsv(transformationTree)
    if (!latestOutputCsv) {
      return csv
    }

    const parsed = parseCsv(latestOutputCsv)
    if (parsed.isErr()) {
      return csv
    }

    return parsed.value
  }, [csv, transformationTree])

  return (
    <ProjectContext.Provider
      value={{
        project,
        csv,
        displayedCsv,
        transformationTree,
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

function getLatestCompletedOutputCsv(
  tree: TransformationTree[],
): string | null {
  const latestCompletedTransformation = getLatestCompletedTransformation(tree)
  if (
    !latestCompletedTransformation
    || !latestCompletedTransformation.outputCsv
  ) {
    return null
  }

  return latestCompletedTransformation.outputCsv
}

function getLatestCompletedTransformation(
  tree: TransformationTree[],
): Transformation | null {
  let latest: Transformation | null = null

  for (const item of tree) {
    if (item.node.status === "completed" && item.node.outputCsv) {
      latest = pickLatestTransformation(latest, item.node)
    }

    const childLatest = getLatestCompletedTransformation(item.children)
    latest = pickLatestTransformation(latest, childLatest)
  }

  return latest
}

function pickLatestTransformation(
  left: Transformation | null,
  right: Transformation | null,
): Transformation | null {
  if (!left) {
    return right
  }

  if (!right) {
    return left
  }

  if (getTransformationTimestamp(right) >= getTransformationTimestamp(left)) {
    return right
  }

  return left
}

function getTransformationTimestamp(transformation: Transformation): number {
  if (transformation.lastExecutedAt) {
    return transformation.lastExecutedAt.getTime()
  }

  return transformation.updatedAt.getTime()
}
