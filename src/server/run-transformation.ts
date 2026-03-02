import "server-only"

import { err, ok, type Result } from "neverthrow"
import { safeExecPython } from "@/src/lib/safe-exec-python"
import { getRunTransformationRecord } from "@/src/server/get-run-transformation-record"
import { getTransformationInputCsv } from "@/src/server/get-transformation-input-csv"

export async function runTransformation(
  transformationId: string,
): Promise<Result<string, string>> {
  const inputResult = await getRunTransformationInput(transformationId)

  if (inputResult.isErr()) {
    return err(inputResult.error)
  }

  const executionResult = await safeExecPython(
    inputResult.value.csv,
    inputResult.value.code,
  )

  if (executionResult.isErr()) {
    return err(executionResult.error)
  }

  console.log("[runTransformation] output:", executionResult.value.outputCsv)

  return ok(executionResult.value.outputCsv)
}

export async function getStoredTransformationCode(
  transformationId: string,
): Promise<Result<string, string>> {
  const transformationResult =
    await getRunTransformationRecord(transformationId)

  if (transformationResult.isErr()) {
    return err(transformationResult.error)
  }

  const code = transformationResult.value.code?.trim()

  if (!code) {
    return err("Generated code is missing.")
  }

  return ok(code)
}

interface RunTransformationInput {
  code: string
  csv: string
}

async function getRunTransformationInput(
  transformationId: string,
): Promise<Result<RunTransformationInput, string>> {
  const codeResult = await getStoredTransformationCode(transformationId)

  if (codeResult.isErr()) {
    return err(codeResult.error)
  }

  const csvResult = await getTransformationInputCsv(transformationId)

  if (csvResult.isErr()) {
    return err(csvResult.error)
  }

  return ok({
    code: codeResult.value,
    csv: csvResult.value,
  })
}
