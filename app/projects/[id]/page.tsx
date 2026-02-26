import { serverGetProject } from "@/src/server/project-actions"
import { parseCsv } from "@/src/lib/csv-parsing"
import { DataTable } from "@/app/components/data-table"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await serverGetProject(id)

  if (!result.ok) {
    return (
      <div className="w-full h-full p-4">
        <p className="text-destructive">{result.error}</p>
      </div>
    )
  }

  const csvResult = parseCsv(result.value.csvContent)

  if (csvResult.isErr()) {
    return (
      <div className="w-full h-full p-4">
        <h1 className="text-3xl font-bold">{result.value.name}</h1>

        <p className="mt-4 text-destructive">{csvResult.error}</p>
      </div>
    )
  }

  const { headers, rows } = csvResult.value

  return (
    <div className="w-full h-full p-4">
      <h1 className="text-3xl font-bold">{result.value.name}</h1>

      <div className="mt-4">
        <DataTable
          headers={headers}
          rows={rows}
        />
      </div>
    </div>
  )
}
