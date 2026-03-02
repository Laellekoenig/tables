import "server-only"

import { eq } from "drizzle-orm"
import { err, ok, ResultAsync, type Result } from "neverthrow"
import { db } from "@/src/db"
import { transformation } from "@/src/db/schemas"
import { safeExecPython } from "@/src/lib/safe-exec-python"
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

interface RunTransformationInput {
  code: string
  csv: string
}

interface TransformationRecord {
  code: string | null
}

async function getRunTransformationInput(
  transformationId: string,
): Promise<Result<RunTransformationInput, string>> {
  const transformationResult = await getTransformationRecord(transformationId)

  if (transformationResult.isErr()) {
    return err(transformationResult.error)
  }

  const code = transformationResult.value.code?.trim()

  if (!code) {
    return err("Generated code is missing.")
  }

  const csvResult = await getTransformationInputCsv(transformationId)

  if (csvResult.isErr()) {
    return err(csvResult.error)
  }

  return ok({
    code,
    csv: csvResult.value,
  })
}

async function getTransformationRecord(
  transformationId: string,
): Promise<Result<TransformationRecord, string>> {
  const recordResult = await ResultAsync.fromPromise(
    db
      .select({
        code: transformation.code,
      })
      .from(transformation)
      .where(eq(transformation.id, transformationId))
      .limit(1),
    () => "Failed to fetch transformation.",
  ).map(rows => rows[0])

  if (recordResult.isErr()) {
    return err(recordResult.error)
  }

  if (!recordResult.value) {
    return err("Transformation not found.")
  }

  return ok(recordResult.value)
}
