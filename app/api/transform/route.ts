import { err, ok, ResultAsync, type Result } from "neverthrow"
import { transformationPhases } from "@/src/db/schemas/transformation-schema"
import { safeRequestJson } from "@/src/lib/safe-request-json"
import { createTransformation } from "@/src/server/create-transformation"
import { getAuthedSession } from "@/src/server/auth-helper"
import { getProjectSnapshot } from "@/src/server/get-project-snapshot"
import { updateTransformationStatus } from "@/src/server/update-transformation-status"

interface TransformRequestBody {
  text: string
  projectId: string
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

  console.log("[api/transform] submitted text:", bodyResult.value.text)

  return new Response(createTransformStream(transformationResult.value.id), {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  })
}

function validateTransformRequestBody(
  value: unknown,
): Result<TransformRequestBody, string> {
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

function createTransformStream(transformationId: string): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const streamResult = await streamTransformationPhases(
        controller,
        encoder,
        transformationId,
      )

      if (streamResult.isErr()) {
        controller.error(streamResult.error)
        return
      }

      controller.close()
    },
  })
}

async function streamTransformationPhases(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  transformationId: string,
): Promise<Result<void, string>> {
  for (const phase of transformationPhases) {
    const updateResult = await updateTransformationStatus(
      transformationId,
      phase,
    )

    if (updateResult.isErr()) {
      return err(updateResult.error)
    }

    controller.enqueue(
      encoder.encode(`${JSON.stringify({ transformationId, phase })}\n`),
    )

    if (phase !== transformationPhases[transformationPhases.length - 1]) {
      await sleep(1000)
    }
  }

  return ok(undefined)
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

function getProjectErrorStatus(error: string): number {
  if (error === "Project not found.") {
    return 404
  }

  return 500
}
