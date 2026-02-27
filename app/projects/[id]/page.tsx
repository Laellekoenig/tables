import { serverGetProject } from "@/src/server/project-actions"
import { parseCsv } from "@/src/lib/csv-parsing"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ProjectLeftPanel } from "@/app/components/project-left-panel"
import { ProjectRightPanel } from "@/app/components/project-right-panel"

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

  return (
    <div className="w-full h-[var(--content-height)]">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="75%">
          <ProjectLeftPanel
            project={result.value}
            csv={csvResult.value}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="25%">
          <ProjectRightPanel projectId={id} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
