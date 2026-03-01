import "server-only"

import { eq } from "drizzle-orm"
import { err, ok, ResultAsync, type Result } from "neverthrow"
import { db } from "@/src/db"
import {
  transformation,
  type TransformationStatus,
} from "@/src/db/schemas/transformation-schema"

export async function updateTransformationStatus(
  transformationId: string,
  status: TransformationStatus,
): Promise<Result<void, string>> {
  const updateResult = await ResultAsync.fromPromise(
    db
      .update(transformation)
      .set({
        status,
      })
      .where(eq(transformation.id, transformationId)),
    () => "Failed to update transformation status.",
  )

  if (updateResult.isErr()) {
    return err(updateResult.error)
  }

  return ok(undefined)
}
