"use client"

import { createContext, useContext, useState } from "react"
import { err, ok, type Result } from "neverthrow"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useProject } from "@/src/hooks/use-project"
import { safeParseJson } from "@/src/lib/safe-event-source"
import { safeFetch } from "@/src/lib/safe-fetch"
import { safeGetReader, safeReadChunk } from "@/src/lib/safe-readable-stream"
import {
  safeParseTransformStreamEvent,
  type TransformStreamEvent,
} from "@/src/lib/transformation-stream"
import {
  transformationPhases,
  type TransformationStatus,
} from "@/src/db/schemas/transformation-schema"
import {
  serverGetTransformations,
  type ServerTransformation,
} from "@/src/server/get-transformations"
import { serverDeleteProjectTransformations } from "@/src/server/delete-project-transformations"

export interface ClientTransformation {
  id: string
  optimisticId: string | null
  prompt: string
  code: string | null
  status: TransformationStatus
  phases: TransformationStatus[]
  state: "streaming" | "complete" | "error"
  errorMessage: string | null
  createdAt: number
}

interface UseTransformationsResult {
  transformations: ClientTransformation[]
  isLoading: boolean
  isDeletingTransformations: boolean
  error: string | null
  sendPrompt: (prompt: string) => Promise<Result<void, string>>
  clearTransformations: () => Promise<Result<void, string>>
  createOptimisticTransformation: (
    prompt: string,
  ) => Promise<ClientTransformation>
  updateTransformationFromStream: (
    optimisticId: string,
    event: TransformStreamEvent,
  ) => void
  markTransformationAsFailed: (
    optimisticId: string,
    errorMessage: string,
  ) => void
  markTransformationAsComplete: (optimisticId: string) => void
}

const TransformationsContext = createContext<UseTransformationsResult | null>(
  null,
)

export function TransformationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { project } = useProject()
  const value = useTransformationsValue(project.id)

  return (
    <TransformationsContext.Provider value={value}>
      {children}
    </TransformationsContext.Provider>
  )
}

export function useTransformations(): UseTransformationsResult {
  const context = useContext(TransformationsContext)

  if (!context) {
    throw new Error(
      "useTransformations must be used within a TransformationsProvider",
    )
  }

  return context
}

function useTransformationsValue(projectId: string): UseTransformationsResult {
  const [clearError, setClearError] = useState<string | null>(null)
  const [isDeletingTransformations, setIsDeletingTransformations] =
    useState(false)
  const queryClient = useQueryClient()
  const queryKey = getTransformationsQueryKey(projectId)

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await serverGetTransformations(projectId)

      if (!result.ok) {
        throw new Error(result.error)
      }

      return result.value.map(mapServerTransformationToClient)
    },
  })

  async function createOptimisticTransformation(
    prompt: string,
  ): Promise<ClientTransformation> {
    await queryClient.cancelQueries({ queryKey })

    const optimisticTransformation = createOptimisticCacheTransformation(prompt)

    queryClient.setQueryData<ClientTransformation[]>(queryKey, old => {
      return [optimisticTransformation, ...(old ?? [])]
    })

    return optimisticTransformation
  }

  async function sendPrompt(prompt: string): Promise<Result<void, string>> {
    const optimisticTransformation =
      await createOptimisticTransformation(prompt)

    const optimisticId =
      optimisticTransformation.optimisticId ?? optimisticTransformation.id

    const responseResult = await safeFetch("/api/transform", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: prompt,
        projectId,
      }),
    })

    if (responseResult.isErr()) {
      markTransformationAsFailed(optimisticId, responseResult.error)
      return err(responseResult.error)
    }

    const streamResult = await consumeTransformationStream(
      responseResult.value,
      event => {
        updateTransformationFromStream(optimisticId, event)
      },
    )

    if (streamResult.isErr()) {
      markTransformationAsFailed(optimisticId, streamResult.error)
      return err(streamResult.error)
    }

    markTransformationAsComplete(optimisticId)
    await queryClient.invalidateQueries({ queryKey })

    return ok(undefined)
  }

  async function clearTransformations(): Promise<Result<void, string>> {
    setClearError(null)
    setIsDeletingTransformations(true)

    await queryClient.cancelQueries({ queryKey })

    const previousTransformations =
      queryClient.getQueryData<ClientTransformation[]>(queryKey) ?? []

    queryClient.setQueryData<ClientTransformation[]>(queryKey, [])

    const deleteResult = await serverDeleteProjectTransformations(projectId)

    if (!deleteResult.ok) {
      queryClient.setQueryData<ClientTransformation[]>(
        queryKey,
        previousTransformations,
      )
      setClearError(deleteResult.error)
      setIsDeletingTransformations(false)
      return err(deleteResult.error)
    }

    await queryClient.invalidateQueries({ queryKey })
    setIsDeletingTransformations(false)

    return ok(undefined)
  }

  function updateTransformationFromStream(
    optimisticId: string,
    event: TransformStreamEvent,
  ): void {
    queryClient.setQueryData<ClientTransformation[]>(queryKey, old => {
      return updateCachedTransformationFromStream(
        old ?? [],
        optimisticId,
        event,
      )
    })
  }

  function markTransformationAsFailed(
    optimisticId: string,
    errorMessage: string,
  ): void {
    queryClient.setQueryData<ClientTransformation[]>(queryKey, old => {
      return updateCachedTransformationError(
        old ?? [],
        optimisticId,
        errorMessage,
      )
    })
  }

  function markTransformationAsComplete(optimisticId: string): void {
    queryClient.setQueryData<ClientTransformation[]>(queryKey, old => {
      return updateCachedTransformationCompletion(old ?? [], optimisticId)
    })
  }

  return {
    transformations: query.data ?? [],
    isLoading: query.isLoading,
    isDeletingTransformations,
    error: getTransformationsError(query.error, clearError),
    sendPrompt,
    clearTransformations,
    createOptimisticTransformation,
    updateTransformationFromStream,
    markTransformationAsFailed,
    markTransformationAsComplete,
  }
}

function getTransformationsQueryKey(projectId: string): string[] {
  return ["transformations", projectId]
}

function getTransformationsError(
  queryError: Error | null,
  clearError: string | null,
): string | null {
  if (clearError) {
    return clearError
  }

  if (queryError) {
    return queryError.message
  }

  return null
}

function mapServerTransformationToClient(
  transformation: ServerTransformation,
): ClientTransformation {
  return {
    id: transformation.id,
    optimisticId: null,
    prompt: transformation.prompt,
    code: transformation.code,
    status: transformation.status,
    phases: getPhasesFromStatus(transformation.status),
    state: getClientTransformationState(transformation.status),
    errorMessage: null,
    createdAt: transformation.createdAt.getTime(),
  }
}

function createOptimisticCacheTransformation(
  prompt: string,
): ClientTransformation {
  const optimisticId = crypto.randomUUID()

  return {
    id: optimisticId,
    optimisticId,
    prompt,
    code: null,
    status: transformationPhases[0],
    phases: [],
    state: "streaming",
    errorMessage: null,
    createdAt: Date.now(),
  }
}

function updateCachedTransformationFromStream(
  transformations: ClientTransformation[],
  optimisticId: string,
  event: TransformStreamEvent,
): ClientTransformation[] {
  if (event.type === "code") {
    return updateCachedTransformationCode(
      transformations,
      optimisticId,
      event.transformationId,
      event.code,
    )
  }

  return transformations.map(transformation => {
    if (
      !doesTransformationMatchEvent(
        transformation,
        optimisticId,
        event.transformationId,
      )
    ) {
      return transformation
    }

    if (transformation.phases.includes(event.phase)) {
      return {
        ...transformation,
        id: event.transformationId,
        status: event.phase,
      }
    }

    return {
      ...transformation,
      id: event.transformationId,
      status: event.phase,
      phases: getPhasesFromStatus(event.phase),
      state: "streaming",
      code: transformation.code,
      errorMessage: null,
    }
  })
}

function updateCachedTransformationCode(
  transformations: ClientTransformation[],
  optimisticId: string,
  serverId: string,
  code: string,
): ClientTransformation[] {
  return transformations.map(transformation => {
    if (!doesTransformationMatchEvent(transformation, optimisticId, serverId)) {
      return transformation
    }

    return {
      ...transformation,
      id: serverId,
      code,
      errorMessage: null,
    }
  })
}

function updateCachedTransformationError(
  transformations: ClientTransformation[],
  optimisticId: string,
  errorMessage: string,
): ClientTransformation[] {
  return transformations.map(transformation => {
    if (!doesTransformationMatchOptimisticId(transformation, optimisticId)) {
      return transformation
    }

    return {
      ...transformation,
      state: "error",
      errorMessage,
    }
  })
}

function updateCachedTransformationCompletion(
  transformations: ClientTransformation[],
  optimisticId: string,
): ClientTransformation[] {
  return transformations.map(transformation => {
    if (!doesTransformationMatchOptimisticId(transformation, optimisticId)) {
      return transformation
    }

    return {
      ...transformation,
      optimisticId: null,
      status: transformationPhases[transformationPhases.length - 1],
      state: "complete",
    }
  })
}

function doesTransformationMatchEvent(
  transformation: ClientTransformation,
  optimisticId: string,
  serverId: string,
): boolean {
  if (transformation.id === serverId) {
    return true
  }

  return doesTransformationMatchOptimisticId(transformation, optimisticId)
}

function doesTransformationMatchOptimisticId(
  transformation: ClientTransformation,
  optimisticId: string,
): boolean {
  return transformation.optimisticId === optimisticId
}

function getPhasesFromStatus(
  status: TransformationStatus,
): TransformationStatus[] {
  const phaseIndex = transformationPhases.indexOf(status)

  if (phaseIndex === -1) {
    return []
  }

  return transformationPhases.slice(0, phaseIndex + 1)
}

function getClientTransformationState(
  status: TransformationStatus,
): ClientTransformation["state"] {
  if (status === "done") {
    return "complete"
  }

  return "streaming"
}

async function consumeTransformationStream(
  response: Response,
  onEvent: (event: TransformStreamEvent) => void,
): Promise<Result<void, string>> {
  const readerResult = safeGetReader(response)

  if (readerResult.isErr()) {
    return err(readerResult.error)
  }

  const decoder = new TextDecoder()

  return readTransformationStreamChunk(readerResult.value, decoder, "", onEvent)
}

async function readTransformationStreamChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  remainder: string,
  onEvent: (event: TransformStreamEvent) => void,
): Promise<Result<void, string>> {
  const chunkResult = await safeReadChunk(reader)

  if (chunkResult.isErr()) {
    return err(chunkResult.error)
  }

  if (chunkResult.value.done) {
    return flushTransformationStreamBuffer(remainder, onEvent)
  }

  const nextBuffer = `${remainder}${decodeChunk(decoder, chunkResult.value.value)}`
  const lineResult = processTransformationStreamLines(nextBuffer, onEvent)

  if (lineResult.isErr()) {
    return err(lineResult.error)
  }

  return readTransformationStreamChunk(
    reader,
    decoder,
    lineResult.value,
    onEvent,
  )
}

function flushTransformationStreamBuffer(
  remainder: string,
  onEvent: (event: TransformStreamEvent) => void,
): Result<void, string> {
  if (!remainder.trim()) {
    return ok(undefined)
  }

  return parseTransformationStreamLine(remainder, onEvent)
}

function processTransformationStreamLines(
  buffer: string,
  onEvent: (event: TransformStreamEvent) => void,
): Result<string, string> {
  const lines = buffer.split("\n")
  const remainder = lines.pop() ?? ""

  for (const line of lines) {
    const lineResult = parseTransformationStreamLine(line, onEvent)

    if (lineResult.isErr()) {
      return err(lineResult.error)
    }
  }

  return ok(remainder)
}

function parseTransformationStreamLine(
  line: string,
  onEvent: (event: TransformStreamEvent) => void,
): Result<void, string> {
  if (!line.trim()) {
    return ok(undefined)
  }

  const jsonResult = safeParseJson<unknown>(line)

  if (jsonResult.isErr()) {
    return err(jsonResult.error)
  }

  const eventResult = safeParseTransformStreamEvent(jsonResult.value)

  if (eventResult.isErr()) {
    return err(eventResult.error)
  }

  onEvent(eventResult.value)
  return ok(undefined)
}

function decodeChunk(decoder: TextDecoder, value: Uint8Array): string {
  return decoder.decode(value, { stream: true })
}
