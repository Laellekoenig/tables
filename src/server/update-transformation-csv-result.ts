import "server-only"

import { eq } from "drizzle-orm"
import { err, ok, ResultAsync, type Result } from "neverthrow"
import { db } from "@/src/db"
import { transformation } from "@/src/db/schemas/transformation-schema"

export async function updateTransformationCsvResult(
  transformationId: string,
  csvResult: string,
): Promise<Result<void, string>> {
  const updateResult = await ResultAsync.fromPromise(
    db
      .update(transformation)
      .set({
        csvResult,
      })
      .where(eq(transformation.id, transformationId)),
    () => "Failed to update transformation CSV result.",
  )

  if (updateResult.isErr()) {
    return err(updateResult.error)
  }

  return ok(undefined)
}
