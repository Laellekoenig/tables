import { serverGetProject } from "@/src/server/project-actions"

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

  return (
    <div className="w-full h-full p-4">
      <h1 className="text-3xl font-bold">{result.value.name}</h1>
    </div>
  )
}
