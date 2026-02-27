import { ParsedCsv } from "@/src/lib/csv-parsing"
import { DataTable } from "./data-table"
import { Project } from "@/src/server/project-actions"

export function ProjectLeftPanel({
  project,
  csv,
}: {
  project: Project
  csv: ParsedCsv
}) {
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
