import "server-only"

import { eq } from "drizzle-orm"
import { err, ok, ResultAsync, type Result } from "neverthrow"
import { db } from "@/src/db"
import { transformation } from "@/src/db/schemas"

export async function getRunTransformationRecord(
  transformationId: string,
): Promise<Result<RunTransformationRecord, string>> {
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

export interface RunTransformationRecord {
  code: string | null
}
