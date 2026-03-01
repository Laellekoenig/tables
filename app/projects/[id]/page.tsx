import { serverGetProject } from "@/src/server/get-project"
import { parseCsv } from "@/src/lib/csv-parsing"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ProjectRightPanel } from "@/components/project-right-panel"
import { ProjectLeftPanel } from "@/components/project-left-panel"
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
          <ResizablePanel
            defaultSize="35%"
            minSize="25%"
            className="min-w-[22rem]"
          >
            <ProjectLeftPanel />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="65%">
            <ProjectRightPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ProjectProvider>
    </div>
  )
}
