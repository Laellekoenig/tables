import "server-only"

import { eq } from "drizzle-orm"
import { err, ok, ResultAsync, type Result } from "neverthrow"
import { db } from "@/src/db"
import { transformation } from "@/src/db/schemas"

export async function getParentTransformationCsv(
  parentId: string,
): Promise<Result<string, string>> {
  const parentResult = await ResultAsync.fromPromise(
    db
      .select({
        csvResult: transformation.csvResult,
      })
      .from(transformation)
      .where(eq(transformation.id, parentId))
      .limit(1),
    () => "Failed to fetch parent transformation CSV.",
  ).map(rows => rows[0])

  if (parentResult.isErr()) {
    return err(parentResult.error)
  }

  if (!parentResult.value) {
    return err("Parent transformation not found.")
  }

  if (parentResult.value.csvResult === null) {
    return err("Parent transformation CSV is missing.")
  }

  return ok(parentResult.value.csvResult)
}
