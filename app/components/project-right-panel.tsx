"use client"

import { DataTable } from "./data-table"
import { useProject } from "@/src/hooks/use-project"

export function ProjectRightPanel() {
  const { displayedCsv } = useProject()
  const { headers, rows } = displayedCsv

  return (
    <div className="h-full w-full flex flex-col">
      <DataTable
        headers={headers}
        rows={rows}
      />
    </div>
  )
}
