"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  safeCreateEventSource,
  safeParseJson,
} from "@/src/lib/safe-event-source"
import { useProject } from "@/src/hooks/use-project"
import {
  serverCreateTransformation,
  serverDeclineTransformation,
  serverGenerateTransformationCode,
  serverRunTransformation,
} from "@/src/server/create-and-execute-transformation"
import {
  type Transformation,
  type TransformationTree,
} from "@/src/server/transformation-helpers"

interface LiveTransformation {
  transformation: Transformation
  phase: string
  submittedAt: number
}

interface ProgressTransformationPayload extends Omit<
  Transformation,
  "createdAt" | "updatedAt" | "lastExecutedAt"
> {
  createdAt: string
  updatedAt: string
  lastExecutedAt: string | null
}

interface ProgressEventPayload {
  transformation: ProgressTransformationPayload
  phase: string
}

interface RenderedTransformation {
  transformation: Transformation
  phase: string
  showSpinner: boolean
  needsApproval: boolean
  orderingTimestamp: number
}

interface ProjectLeftPanelContextValue {
  isSubmitting: boolean
  renderedTransformations: RenderedTransformation[]
  approvalLoadingById: Record<string, boolean>
  submitPrompt: (prompt: string) => Promise<boolean>
  acceptExecution: (transformation: Transformation) => Promise<void>
  declineExecution: (transformation: Transformation) => Promise<void>
}

const ProjectLeftPanelContext =
  createContext<ProjectLeftPanelContextValue | null>(null)

export function ProjectLeftPanelProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { project, transformationTree } = useProject()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [liveTransformations, setLiveTransformations] = useState<
    LiveTransformation[]
  >([])
  const [approvalLoadingById, setApprovalLoadingById] = useState<
    Record<string, boolean>
  >({})
  const streamsRef = useRef<Map<string, EventSource>>(new Map())
  const persistedTransformations = useMemo(() => {
    return flattenTree(transformationTree)
  }, [transformationTree])

  useEffect(() => {
    return () => {
      for (const stream of streamsRef.current.values()) {
        stream.close()
      }

      streamsRef.current.clear()
    }
  }, [])

  async function submitPrompt(rawPrompt: string): Promise<boolean> {
    const prompt = rawPrompt.trim()
    if (!prompt) {
      return false
    }

    const parentId = getLatestCompletedTransformationId(
      persistedTransformations,
      liveTransformations,
    )
    const tempId = `temp-${crypto.randomUUID()}`
    const submittedAt = getNextSubmittedAt(
      persistedTransformations,
      liveTransformations,
    )

    setLiveTransformations(previous => {
      return [
        ...previous,
        {
          transformation: createOptimisticTransformation(
            tempId,
            project.id,
            parentId,
            prompt,
            submittedAt,
          ),
          phase: "Creating transformation",
          submittedAt,
        },
      ]
    })

    setIsSubmitting(true)

    const createResult = await serverCreateTransformation({
      projectId: project.id,
      parentId,
      prompt,
    })

    setIsSubmitting(false)

    if (!createResult.ok) {
      setLiveTransformations(previous => {
        return previous.filter(item => item.transformation.id !== tempId)
      })
      toast.error(createResult.error)
      return false
    }

    setLiveTransformations(previous => {
      const withoutTemp = previous.filter(
        item => item.transformation.id !== tempId,
      )

      return [
        ...withoutTemp,
        {
          transformation: createResult.value,
          phase: "Generating transformation code",
          submittedAt,
        },
      ]
    })

    ensureProgressStream(createResult.value.id, submittedAt)

    void serverGenerateTransformationCode({
      projectId: project.id,
      transformationId: createResult.value.id,
    }).then(generateResult => {
      if (generateResult.ok) {
        return
      }

      setLiveTransformations(previous => {
        return previous.map(item => {
          if (item.transformation.id !== createResult.value.id) {
            return item
          }

          return {
            ...item,
            phase: "Generation failed",
            transformation: {
              ...item.transformation,
              status: "error",
              errorMessage: generateResult.error,
            },
          }
        })
      })

      closeStream(createResult.value.id)
      router.refresh()
    })

    return true
  }

  async function acceptExecution(transformation: Transformation) {
    setApprovalLoading(transformation.id, true)
    ensureProgressStream(transformation.id, transformation.createdAt.getTime())

    const runResult = await serverRunTransformation({
      projectId: project.id,
      transformationId: transformation.id,
    })

    setApprovalLoading(transformation.id, false)

    if (!runResult.ok) {
      toast.error(runResult.error)
      return
    }

    if (runResult.value.status === "error") {
      if (runResult.value.errorMessage) {
        toast.error(runResult.value.errorMessage)
      }
    }

    updateLiveTransformation(
      transformation.id,
      runResult.value,
      getDefaultPhase(runResult.value),
      transformation.createdAt.getTime(),
      setLiveTransformations,
    )
  }

  async function declineExecution(transformation: Transformation) {
    setApprovalLoading(transformation.id, true)
    ensureProgressStream(transformation.id, transformation.createdAt.getTime())

    const declineResult = await serverDeclineTransformation({
      projectId: project.id,
      transformationId: transformation.id,
    })

    setApprovalLoading(transformation.id, false)

    if (!declineResult.ok) {
      toast.error(declineResult.error)
      return
    }

    updateLiveTransformation(
      transformation.id,
      declineResult.value,
      getDefaultPhase(declineResult.value),
      transformation.createdAt.getTime(),
      setLiveTransformations,
    )
  }

  function ensureProgressStream(
    transformationId: string,
    submittedAt: number,
  ): boolean {
    const existing = streamsRef.current.get(transformationId)
    if (existing) {
      return true
    }

    const streamResult = safeCreateEventSource(
      `/api/transformation-progress?transformationId=${transformationId}&projectId=${project.id}`,
    )
    if (streamResult.isErr()) {
      toast.error(streamResult.error)
      return false
    }

    const stream = streamResult.value
    streamsRef.current.set(transformationId, stream)

    stream.addEventListener("status", event => {
      const parseResult = safeParseJson<ProgressEventPayload>(
        (event as MessageEvent<string>).data,
      )
      if (parseResult.isErr()) {
        return
      }

      updateLiveTransformation(
        transformationId,
        hydrateTransformation(parseResult.value.transformation),
        parseResult.value.phase,
        submittedAt,
        setLiveTransformations,
      )
    })

    stream.addEventListener("done", event => {
      const parseResult = safeParseJson<ProgressEventPayload>(
        (event as MessageEvent<string>).data,
      )

      if (parseResult.isOk()) {
        updateLiveTransformation(
          transformationId,
          hydrateTransformation(parseResult.value.transformation),
          parseResult.value.phase,
          submittedAt,
          setLiveTransformations,
        )
      }

      closeStream(transformationId)
      router.refresh()

      setTimeout(() => {
        setLiveTransformations(previous => {
          return previous.filter(
            item => item.transformation.id !== transformationId,
          )
        })
      }, 1000)
    })

    stream.addEventListener("error", event => {
      const parseResult = safeParseJson<{ message: string }>(
        (event as MessageEvent<string>).data,
      )

      if (parseResult.isOk()) {
        toast.error(parseResult.value.message)
      }

      setLiveTransformations(previous => {
        return previous.map(item => {
          if (item.transformation.id !== transformationId) {
            return item
          }

          if (isTerminalStatus(item.transformation.status)) {
            return item
          }

          return {
            ...item,
            phase: "Lost connection, retrying",
          }
        })
      })
    })

    return true
  }

  function closeStream(transformationId: string) {
    const existing = streamsRef.current.get(transformationId)
    if (!existing) {
      return
    }

    existing.close()
    streamsRef.current.delete(transformationId)
  }

  function setApprovalLoading(transformationId: string, isLoading: boolean) {
    setApprovalLoadingById(previous => {
      const next = { ...previous }

      if (isLoading) {
        next[transformationId] = true
        return next
      }

      delete next[transformationId]
      return next
    })
  }

  const renderedTransformations = useMemo(() => {
    return getRenderedTransformations(
      persistedTransformations,
      liveTransformations,
    )
  }, [persistedTransformations, liveTransformations])

  const value: ProjectLeftPanelContextValue = {
    isSubmitting,
    renderedTransformations,
    approvalLoadingById,
    submitPrompt,
    acceptExecution,
    declineExecution,
  }

  return (
    <ProjectLeftPanelContext.Provider value={value}>
      {children}
    </ProjectLeftPanelContext.Provider>
  )
}

export function useProjectLeftPanel(): ProjectLeftPanelContextValue {
  const context = useContext(ProjectLeftPanelContext)
  if (!context) {
    throw new Error(
      "useProjectLeftPanel must be used within a ProjectLeftPanelProvider",
    )
  }

  return context
}

function flattenTree(tree: TransformationTree[]): Transformation[] {
  const result: Transformation[] = []

  for (const item of tree) {
    result.push(item.node)
    result.push(...flattenTree(item.children))
  }

  return result
}

function createOptimisticTransformation(
  id: string,
  projectId: string,
  parentId: string | null,
  prompt: string,
  createdAtTimestamp: number,
): Transformation {
  const createdAt = new Date(createdAtTimestamp)

  return {
    id,
    projectId,
    parentId,
    prompt,
    codeSnippet: null,
    outputCsv: null,
    status: "pending",
    errorMessage: null,
    lastExecutedAt: null,
    createdAt,
    updatedAt: createdAt,
  }
}

function hydrateTransformation(
  payload: ProgressTransformationPayload,
): Transformation {
  return {
    ...payload,
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
    lastExecutedAt:
      payload.lastExecutedAt ? new Date(payload.lastExecutedAt) : null,
  }
}

function updateLiveTransformation(
  transformationId: string,
  transformation: Transformation,
  phase: string,
  submittedAt: number,
  setLiveTransformations: Dispatch<SetStateAction<LiveTransformation[]>>,
) {
  setLiveTransformations(previous => {
    const existing = previous.find(
      item => item.transformation.id === transformationId,
    )

    if (!existing) {
      return [
        ...previous,
        {
          transformation,
          phase,
          submittedAt,
        },
      ]
    }

    return previous.map(item => {
      if (item.transformation.id !== transformationId) {
        return item
      }

      return {
        ...item,
        transformation,
        phase,
      }
    })
  })
}

function getRenderedTransformations(
  persisted: Transformation[],
  live: LiveTransformation[],
): RenderedTransformation[] {
  const renderedById = new Map<string, RenderedTransformation>()

  for (const item of persisted) {
    renderedById.set(item.id, {
      transformation: item,
      phase: getDefaultPhase(item),
      showSpinner: shouldShowSpinner(item),
      needsApproval: requiresApproval(item),
      orderingTimestamp: getCreationTimestamp(item),
    })
  }

  for (const liveItem of live) {
    renderedById.set(liveItem.transformation.id, {
      transformation: liveItem.transformation,
      phase: liveItem.phase,
      showSpinner: shouldShowSpinner(liveItem.transformation),
      needsApproval: requiresApproval(liveItem.transformation),
      orderingTimestamp: liveItem.submittedAt,
    })
  }

  const rendered = [...renderedById.values()]
  rendered.sort((left, right) => {
    const leftTimestamp = left.orderingTimestamp
    const rightTimestamp = right.orderingTimestamp
    if (leftTimestamp !== rightTimestamp) {
      return leftTimestamp - rightTimestamp
    }

    return left.transformation.id.localeCompare(right.transformation.id)
  })

  return rendered
}

function getNextSubmittedAt(
  persisted: Transformation[],
  live: LiveTransformation[],
): number {
  let latestTimestamp = 0

  for (const item of persisted) {
    const createdAt = getCreationTimestamp(item)
    if (createdAt > latestTimestamp) {
      latestTimestamp = createdAt
    }
  }

  for (const item of live) {
    if (item.submittedAt > latestTimestamp) {
      latestTimestamp = item.submittedAt
    }
  }

  const now = Date.now()
  if (now > latestTimestamp) {
    return now
  }

  return latestTimestamp + 1
}

function getCreationTimestamp(transformation: Transformation): number {
  return transformation.createdAt.getTime()
}

function getLatestCompletedTransformationId(
  persisted: Transformation[],
  live: LiveTransformation[],
): string | null {
  const transformationById = new Map<string, Transformation>()

  for (const item of persisted) {
    transformationById.set(item.id, item)
  }

  for (const item of live) {
    transformationById.set(item.transformation.id, item.transformation)
  }

  const latestCompletedTransformation = getLatestCompletedTransformation([
    ...transformationById.values(),
  ])
  if (!latestCompletedTransformation) {
    return null
  }

  return latestCompletedTransformation.id
}

function getLatestCompletedTransformation(
  transformations: Transformation[],
): Transformation | null {
  let latest: Transformation | null = null

  for (const item of transformations) {
    if (item.status === "completed" && item.outputCsv) {
      latest = pickLatestTransformation(latest, item)
    }
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

function getDefaultPhase(transformation: Transformation): string {
  if (transformation.status === "pending") {
    if (transformation.codeSnippet) {
      return "Awaiting approval"
    }

    return "Generating transformation code"
  }

  if (transformation.status === "running") {
    return "Executing transformation"
  }

  if (transformation.status === "error") {
    if (transformation.errorMessage === "Execution declined by user.") {
      return "Declined"
    }

    return "Failed"
  }

  if (transformation.status === "stale") {
    return "Stale"
  }

  return "Completed"
}

function requiresApproval(transformation: Transformation): boolean {
  if (transformation.status !== "pending") {
    return false
  }

  if (!transformation.codeSnippet) {
    return false
  }

  return true
}

function shouldShowSpinner(transformation: Transformation): boolean {
  if (transformation.status === "running") {
    return true
  }

  if (transformation.status === "pending" && !transformation.codeSnippet) {
    return true
  }

  return false
}

function isTerminalStatus(status: Transformation["status"]): boolean {
  if (status === "completed") {
    return true
  }

  if (status === "error") {
    return true
  }

  if (status === "stale") {
    return true
  }

  return false
}
