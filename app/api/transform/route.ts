import { NextResponse } from "next/server"
import { err, ok, Result, ResultAsync } from "neverthrow"

import { safeGenerateText } from "@/src/lib/safe-generate"
import { getAuthedSession } from "@/src/server/auth-helper"

const SYSTEM_PROMPT = `You are a data transformation assistant. Generate a Python script that:
- Imports pandas and numpy
- Reads a CSV file from "data.csv" using pandas
- Applies the transformation described by the user
- Saves the transformed data to "transformed.csv" using pandas

Output ONLY the Python script. No markdown, no explanations, no code fences.`

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

  const generateResult = await safeGenerateText(SYSTEM_PROMPT, prompt)

  if (generateResult.isErr()) {
    return NextResponse.json({ error: generateResult.error }, { status: 500 })
  }

  console.log(`[transform] generated script:\n${generateResult.value}`)

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
