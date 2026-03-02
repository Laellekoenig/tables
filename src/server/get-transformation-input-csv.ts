import "server-only"

import { err, type Result } from "neverthrow"
import { getParentTransformationCsv } from "@/src/server/get-transformation-input-csv-parent-csv"
import { getProjectCsv } from "@/src/server/get-transformation-input-csv-project-csv"
import { getTransformationRecord } from "@/src/server/get-transformation-input-csv-record"

export async function getTransformationInputCsv(
  transformationId: string,
): Promise<Result<string, string>> {
  const transformationResult = await getTransformationRecord(transformationId)

  if (transformationResult.isErr()) {
    return err(transformationResult.error)
  }

  if (transformationResult.value.parentId) {
    return getParentTransformationCsv(transformationResult.value.parentId)
  }

  return getProjectCsv(transformationResult.value.projectId)
}
