import { err, ok, type Result } from "neverthrow"
import { safeRequestJson } from "@/src/lib/safe-request-json"

interface TransformRequestBody {
  text: string
}

export async function POST(request: Request): Promise<Response> {
  const bodyResult = await safeRequestJson<unknown>(request).andThen(
    validateTransformRequestBody,
  )

  if (bodyResult.isErr()) {
    return Response.json({ error: bodyResult.error }, { status: 400 })
  }

  await sleep(1500)

  console.log("[api/transform] submitted text:", bodyResult.value.text)

  return Response.json({ ok: true })
}

function validateTransformRequestBody(
  value: unknown,
): Result<TransformRequestBody, string> {
  if (!isTransformRequestBody(value)) {
    return err("Request body must include a text field.")
  }

  const text = value.text.trim()
  if (!text) {
    return err("Text is required.")
  }

  return ok({ text })
}

function isTransformRequestBody(value: unknown): value is TransformRequestBody {
  if (typeof value !== "object" || value === null) {
    return false
  }

  if (!("text" in value)) {
    return false
  }

  return typeof value.text === "string"
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
