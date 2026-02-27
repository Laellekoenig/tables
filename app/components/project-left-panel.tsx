"use client"

import { DataTable } from "./data-table"
import { useProject } from "@/src/hooks/use-project"

export function ProjectLeftPanel() {
  const { project, csv } = useProject()
  const { headers, rows } = csv

  return (
    <div className="p-8 h-full w-full flex flex-col gap-8 min-h-0">
      <h1 className="text-3xl font-bold">{project.name}</h1>

      <DataTable
        headers={headers}
        rows={rows}
      />
    </div>
  )
}
