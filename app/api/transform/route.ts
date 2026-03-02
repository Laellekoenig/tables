import { err, ok, Result, type Result as NeverthrowResult } from "neverthrow"
import { transformationPhases } from "@/src/db/schemas/transformation-schema"
import { safeRequestJson } from "@/src/lib/safe-request-json"
import { type TransformStreamEvent } from "@/src/lib/transformation-stream"
import { createTransformation } from "@/src/server/create-transformation"
import { streamTransformationCode } from "@/src/server/generate-transformation-code"
import { streamTransformationExplanation } from "@/src/server/generate-transformation-explanation"
import { getAuthedSession } from "@/src/server/auth-helper"
import { getProjectSnapshot } from "@/src/server/get-project-snapshot"
import { getTransformationInputCsv } from "@/src/server/get-transformation-input-csv"
import {
  getStoredTransformationCode,
  runTransformation,
} from "@/src/server/run-transformation"
import { updateTransformationCode } from "@/src/server/update-transformation-code"
import { updateTransformationCsvResult } from "@/src/server/update-transformation-csv-result"
import { updateTransformationExplanation } from "@/src/server/update-transformation-explanation"
import { updateTransformationStatus } from "@/src/server/update-transformation-status"

interface TransformRequestBody {
  text: string
  projectId: string
}

interface CreateTransformStreamInput {
  inputCsv: string
  prompt: string
  transformationId: string
}

interface StreamTransformationPhasesInput {
  controller: ReadableStreamDefaultController<Uint8Array>
  encoder: TextEncoder
  inputCsv: string
  prompt: string
  transformationId: string
}

interface ExecuteTransformationStageInput {
  controller: ReadableStreamDefaultController<Uint8Array>
  encoder: TextEncoder
  inputCsv: string
  phase: (typeof transformationPhases)[number]
  prompt: string
  transformationId: string
}

export async function POST(request: Request): Promise<Response> {
  const bodyResult = await safeRequestJson<unknown>(request).andThen(
    validateTransformRequestBody,
  )

  if (bodyResult.isErr()) {
    return Response.json({ error: bodyResult.error }, { status: 400 })
  }

  const sessionResult = await getAuthedSession()
  if (sessionResult.isErr()) {
    return Response.json({ error: sessionResult.error }, { status: 401 })
  }

  const projectResult = await getProjectSnapshot(
    bodyResult.value.projectId,
    sessionResult.value.user.id,
  )
  if (projectResult.isErr()) {
    return Response.json(
      { error: projectResult.error },
      { status: getProjectErrorStatus(projectResult.error) },
    )
  }

  const transformationResult = await createTransformation({
    projectId: bodyResult.value.projectId,
    prompt: bodyResult.value.text,
  })
  if (transformationResult.isErr()) {
    return Response.json({ error: transformationResult.error }, { status: 500 })
  }

  const inputCsvResult = await getTransformationInputCsv(
    transformationResult.value.id,
  )

  if (inputCsvResult.isErr()) {
    return Response.json({ error: inputCsvResult.error }, { status: 500 })
  }

  return new Response(
    createTransformStream({
      transformationId: transformationResult.value.id,
      prompt: bodyResult.value.text,
      inputCsv: inputCsvResult.value,
    }),
    {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    },
  )
}

function validateTransformRequestBody(
  value: unknown,
): NeverthrowResult<TransformRequestBody, string> {
  if (!isTransformRequestBody(value)) {
    return err("Request body must include text and projectId fields.")
  }

  const text = value.text.trim()
  if (!text) {
    return err("Text is required.")
  }

  const projectId = value.projectId.trim()
  if (!projectId) {
    return err("Project ID is required.")
  }

  return ok({ text, projectId })
}

function isTransformRequestBody(value: unknown): value is TransformRequestBody {
  if (typeof value !== "object" || value === null) {
    return false
  }

  if (!("text" in value)) {
    return false
  }

  if (!("projectId" in value)) {
    return false
  }

  if (typeof value.text !== "string") {
    return false
  }

  return typeof value.projectId === "string"
}

function createTransformStream({
  transformationId,
  prompt,
  inputCsv,
}: CreateTransformStreamInput): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const streamResult = await streamTransformationPhases({
        controller,
        encoder,
        transformationId,
        prompt,
        inputCsv,
      })

      if (streamResult.isErr()) {
        controller.error(streamResult.error)
        return
      }

      controller.close()
    },
  })
}

async function streamTransformationPhases(
  input: StreamTransformationPhasesInput,
): Promise<Result<void, string>> {
  const { transformationId, controller, encoder } = input

  for (const phase of transformationPhases) {
    const updateResult = await updateTransformationStatus(
      transformationId,
      phase,
    )

    if (updateResult.isErr()) {
      return err(updateResult.error)
    }

    const enqueuePhaseResult = enqueueTransformStreamEvent(
      controller,
      encoder,
      {
        type: "phase",
        transformationId,
        phase,
      },
    )

    if (enqueuePhaseResult.isErr()) {
      return err(enqueuePhaseResult.error)
    }

    const phaseResult = await executeTransformationStage({
      ...input,
      phase,
    })

    if (phaseResult.isErr()) {
      return err(phaseResult.error)
    }
  }

  return ok(undefined)
}

async function executeTransformationStage({
  controller,
  encoder,
  transformationId,
  phase,
  prompt,
  inputCsv,
}: ExecuteTransformationStageInput): Promise<Result<void, string>> {
  if (phase === "generating") {
    const generationResult = await streamTransformationCode(
      prompt,
      inputCsv,
      code => {
        return enqueueTransformStreamEvent(controller, encoder, {
          type: "code",
          transformationId,
          code,
        })
      },
    )

    if (generationResult.isErr()) {
      return err(generationResult.error)
    }

    const updateCodeResult = await updateTransformationCode(
      transformationId,
      generationResult.value,
    )

    if (updateCodeResult.isErr()) {
      return err(updateCodeResult.error)
    }

    return ok(undefined)
  }

  if (phase === "running") {
    const runResult = await runTransformation(transformationId)

    if (runResult.isErr()) {
      return err(runResult.error)
    }

    const updateCsvResult = await updateTransformationCsvResult(
      transformationId,
      runResult.value,
    )

    if (updateCsvResult.isErr()) {
      return err(updateCsvResult.error)
    }

    return enqueueTransformStreamEvent(controller, encoder, {
      type: "csv",
      transformationId,
      csv: runResult.value,
    })
  }

  if (phase === "explanation") {
    const codeResult = await getStoredTransformationCode(transformationId)

    if (codeResult.isErr()) {
      return err(codeResult.error)
    }

    const explanationResult = await streamTransformationExplanation(
      codeResult.value,
      inputCsv,
      explanation => {
        return enqueueTransformStreamEvent(controller, encoder, {
          type: "explanation",
          transformationId,
          explanation,
        })
      },
    )

    if (explanationResult.isErr()) {
      return err(explanationResult.error)
    }

    const updateExplanationResult = await updateTransformationExplanation(
      transformationId,
      explanationResult.value,
    )

    if (updateExplanationResult.isErr()) {
      return err(updateExplanationResult.error)
    }

    return ok(undefined)
  }

  return ok(undefined)
}

function enqueueTransformStreamEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: TransformStreamEvent,
): Result<void, string> {
  return enqueueStreamEvent({ controller, encoder, event })
}

const enqueueStreamEvent = Result.fromThrowable(
  ({
    controller,
    encoder,
    event,
  }: {
    controller: ReadableStreamDefaultController<Uint8Array>
    encoder: TextEncoder
    event: TransformStreamEvent
  }) => {
    controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
  },
  () => "Failed to write transformation stream event.",
)

function getProjectErrorStatus(error: string): number {
  if (error === "Project not found.") {
    return 404
  }

  return 500
}
