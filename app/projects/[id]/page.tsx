import { serverGetProject } from "@/src/server/project-actions"
import { parseCsv } from "@/src/lib/csv-parsing"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ProjectLeftPanel } from "@/app/components/project-left-panel"
import { ProjectRightPanel } from "@/app/components/project-right-panel"
import { ProjectProvider } from "@/src/hooks/use-project"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectResult = await serverGetProject(id)

  if (!projectResult.ok) {
    return (
      <div className="w-full h-full p-4">
        <p className="text-destructive">{projectResult.error}</p>
      </div>
    )
  }

  const csvResult = parseCsv(projectResult.value.csvContent)

  if (csvResult.isErr()) {
    return (
      <div className="w-full h-full p-4">
        <h1 className="text-3xl font-bold">{projectResult.value.name}</h1>

        <p className="mt-4 text-destructive">{csvResult.error}</p>
      </div>
    )
  }

  return (
    <div className="w-full h-[var(--content-height)]">
      <ProjectProvider
        project={projectResult.value}
        csv={csvResult.value}
      >
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize="75%">
            <ProjectLeftPanel />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="25%">
            <ProjectRightPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ProjectProvider>
    </div>
  )
}
