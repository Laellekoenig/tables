import "server-only"

import { err, ok, ResultAsync, type Result } from "neverthrow"
import { createCsvHeadPreview } from "@/src/lib/csv-head-preview"
import { safeStreamGenerateText } from "@/src/lib/safe-stream-generate"

export async function streamTransformationExplanation(
  code: string,
  inputCsv: string,
  onExplanation: (explanation: string) => Result<void, string>,
): Promise<Result<string, string>> {
  const generationResult = await ResultAsync.fromPromise(
    streamTransformationExplanationInternal(code, inputCsv, onExplanation),
    (error: unknown) => {
      console.error(
        "[streamTransformationExplanation] Generation failed:",
        error,
      )
      return "Failed to generate explanation."
    },
  )

  if (generationResult.isErr()) {
    return err(generationResult.error)
  }

  return generationResult.value
}

async function streamTransformationExplanationInternal(
  code: string,
  inputCsv: string,
  onExplanation: (explanation: string) => Result<void, string>,
): Promise<Result<string, string>> {
  const csvHeadResult = createCsvHeadPreview(inputCsv)

  if (csvHeadResult.isErr()) {
    return err(csvHeadResult.error)
  }

  const streamResult = safeStreamGenerateText(
    getTransformationExplanationSystemPrompt(),
    getTransformationExplanationUserPrompt(code, csvHeadResult.value),
    "openai/gpt-5.2",
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

    const explanationResult = onExplanation(generatedText.trim())

    if (explanationResult.isErr()) {
      return err(explanationResult.error)
    }
  }

  const normalizedExplanation = generatedText.trim()

  if (!normalizedExplanation) {
    return err("Generated explanation was empty.")
  }

  return ok(normalizedExplanation)
}

function getTransformationExplanationSystemPrompt(): string {
  return [
    "You explain pandas transformation functions exactly as written.",
    "Use the provided Python code as the source of truth.",
    "Describe the implemented behavior in execution order.",
    "Be precise about filtering, sorting, renaming, derived columns, type conversions, missing-value handling, and what the returned DataFrame contains.",
    "Do not describe intent that is not implemented in the code.",
    "If a detail cannot be determined from the code alone, say so briefly.",
    "Return plain text only.",
  ].join("\n")
}

function getTransformationExplanationUserPrompt(
  code: string,
  csvHead: string,
): string {
  return [
    "Explain exactly what this Python transformation function does.",
    "Keep the explanation concise but complete enough for a user reading the transformation card.",
    "Mention the concrete columns and operations that appear in the code when possible.",
    "This is the input df.head() preview:",
    csvHead,
    "This is the Python code:",
    code,
  ].join("\n\n")
}
