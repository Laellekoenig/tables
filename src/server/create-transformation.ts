import "server-only"

import { desc, eq } from "drizzle-orm"
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

  const createResult = await getNewestTransformationId(projectId)
    .andThen(parentId =>
      ResultAsync.fromPromise(
        db
          .insert(transformation)
          .values({
            id,
            projectId,
            parentId,
            prompt,
            status: transformationPhases[0],
          })
          .returning({ id: transformation.id }),
        () => "Failed to create transformation.",
      ),
    )
    .map(rows => rows[0] ?? { id })

  if (createResult.isErr()) {
    return err(createResult.error)
  }

  return createResult
}

function getNewestTransformationId(
  projectId: string,
): ResultAsync<string | null, string> {
  return ResultAsync.fromPromise(
    db
      .select({ id: transformation.id })
      .from(transformation)
      .where(eq(transformation.projectId, projectId))
      .orderBy(desc(transformation.createdAt))
      .limit(1),
    () => "Failed to load existing transformations.",
  ).map(rows => rows[0]?.id ?? null)
}
