import { NextResponse } from "next/server"
import { err, ok, Result, ResultAsync } from "neverthrow"

import { getAuthedSession } from "@/src/server/auth-helper"

interface TransformRequest {
  prompt: string
  projectId: string
}

export async function POST(request: Request) {
  const sessionResult = await getAuthedSession()

  if (sessionResult.isErr()) {
    return NextResponse.json({ error: sessionResult.error }, { status: 401 })
  }

  const bodyResult = await ResultAsync.fromPromise(
    request.json() as Promise<unknown>,
    () => "Failed to parse request body.",
  )

  if (bodyResult.isErr()) {
    return NextResponse.json({ error: bodyResult.error }, { status: 400 })
  }

  const parseResult = parseBody(bodyResult.value)

  if (parseResult.isErr()) {
    return NextResponse.json({ error: parseResult.error }, { status: 400 })
  }

  const { prompt, projectId } = parseResult.value
  const userId = sessionResult.value.user.id

  console.log(
    `[transform] user=${userId} project=${projectId} prompt="${prompt}"`,
  )

  return NextResponse.json({ message: "ok" }, { status: 200 })
}

function parseBody(body: unknown): Result<TransformRequest, string> {
  if (typeof body !== "object" || body === null) {
    return err("Invalid request body.")
  }

  const { prompt, projectId } = body as Record<string, unknown>

  if (typeof prompt !== "string" || !prompt.trim()) {
    return err("Prompt is required.")
  }

  if (typeof projectId !== "string" || !projectId.trim()) {
    return err("Project ID is required.")
  }

  return ok({ prompt: prompt.trim(), projectId: projectId.trim() })
}
