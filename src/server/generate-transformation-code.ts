import "server-only"

import { err, ok, ResultAsync, type Result } from "neverthrow"
import { createCsvHeadPreview } from "@/src/lib/csv-head-preview"
import { safeStreamGenerateText } from "@/src/lib/safe-stream-generate"

export async function streamTransformationCode(
  prompt: string,
  inputCsv: string,
  onCode: (code: string) => Result<void, string>,
): Promise<Result<string, string>> {
  const generationResult = await ResultAsync.fromPromise(
    streamTransformationCodeInternal(prompt, inputCsv, onCode),
    (error: unknown) => {
      console.error("[streamTransformationCode] Generation failed:", error)
      return "Failed to generate text."
    },
  )

  if (generationResult.isErr()) {
    return err(generationResult.error)
  }

  return generationResult.value
}

async function streamTransformationCodeInternal(
  prompt: string,
  inputCsv: string,
  onCode: (code: string) => Result<void, string>,
): Promise<Result<string, string>> {
  const csvHeadResult = createCsvHeadPreview(inputCsv)

  if (csvHeadResult.isErr()) {
    return err(csvHeadResult.error)
  }

  const streamResult = safeStreamGenerateText(
    getTransformationSystemPrompt(),
    getTransformationUserPrompt(prompt, csvHeadResult.value),
  )

  if (streamResult.isErr()) {
    return err(streamResult.error)
  }

  let generatedText = ""

  for await (const chunk of streamResult.value.fullStream) {
    if (chunk.type !== "text-delta") {
      continue
    }

    generatedText += chunk.text

    const codeResult = onCode(generatedText.trim())

    if (codeResult.isErr()) {
      return err(codeResult.error)
    }
  }

  const normalizedCode = generatedText.trim()

  if (!normalizedCode) {
    return err("Generated code was empty.")
  }

  return ok(normalizedCode)
}

function getTransformationSystemPrompt(): string {
  return [
    "You generate Python transformation scripts using pandas.",
    "Return only executable Python code with no markdown fences or explanation.",
    "Return a single function that takes a pandas DataFrame and returns the transformed pandas DataFrame.",
    "Name the function transform.",
    "Use Python type annotations for the function signature.",
    "Do not write any import statements.",
    "Assume pandas is already available as pd and numpy is already available as np.",
    "Do not read from files or write to files.",
    "Use pandas for the transformation logic.",
    "Preserve existing columns unless the user explicitly asks to remove or replace them.",
  ].join("\n")
}

function getTransformationUserPrompt(prompt: string, csvHead: string): string {
  return [
    "Create a Python function that satisfies this transformation request:",
    prompt,
    "This is the pandas df.head() preview of the input data:",
    csvHead,
  ].join("\n\n")
}
