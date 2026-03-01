import "server-only"

import { err, ResultAsync, type Result } from "neverthrow"
import { db } from "@/src/db"
import {
  transformation,
  transformationPhases,
} from "@/src/db/schemas/transformation-schema"

export async function createTransformation({
  projectId,
  prompt,
}: {
  projectId: string
  prompt: string
}): Promise<Result<{ id: string }, string>> {
  const id = crypto.randomUUID()

  const createResult = await ResultAsync.fromPromise(
    db
      .insert(transformation)
      .values({
        id,
        projectId,
        prompt,
        status: transformationPhases[0],
      })
      .returning({ id: transformation.id }),
    () => "Failed to create transformation.",
  ).map(rows => rows[0] ?? { id })

  if (createResult.isErr()) {
    return err(createResult.error)
  }

  return createResult
}
