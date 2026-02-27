"use server"

import { ResultAsync } from "neverthrow"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/src/db"
import { transformation } from "@/src/db/schemas/transformation-schema"
import { ActionResult } from "@/src/types/action-result"
import { getAuthedSession, verifyProjectOwnership } from "./auth-helper"
import { collectDescendantIds } from "./transformation-helpers"

export async function serverDeleteTransformation(
  id: string,
): Promise<ActionResult<void>> {
  const sessionResult = await getAuthedSession()
  if (sessionResult.isErr()) {
    return { ok: false, error: "Not signed-in" }
  }

  const session = sessionResult.value

  // Fetch the transformation and verify ownership via project
  const rowResult = await ResultAsync.fromPromise(
    db.select().from(transformation).where(eq(transformation.id, id)).limit(1),
    () => "Failed to fetch transformation.",
  ).map(rows => rows[0])

  if (rowResult.isErr()) {
    return { ok: false, error: rowResult.error }
  }

  if (!rowResult.value) {
    return { ok: false, error: "Transformation not found." }
  }

  const row = rowResult.value

  const ownershipResult = await verifyProjectOwnership(
    row.projectId,
    session.user.id,
  )
  if (!ownershipResult.ok) {
    return { ok: false, error: "Transformation not found." }
  }

  // Fetch all transformations for this project to find descendants
  const allRows = await ResultAsync.fromPromise(
    db
      .select()
      .from(transformation)
      .where(eq(transformation.projectId, row.projectId)),
    () => "Failed to fetch transformations.",
  )

  if (allRows.isErr()) {
    return { ok: false, error: allRows.error }
  }

  const descendantIds = collectDescendantIds(allRows.value, id)
  const idsToDelete = [id, ...descendantIds]

  const deleteResult = await ResultAsync.fromPromise(
    db.delete(transformation).where(inArray(transformation.id, idsToDelete)),
    () => "Failed to delete transformations.",
  )

  if (deleteResult.isErr()) {
    return { ok: false, error: deleteResult.error }
  }

  return { ok: true, value: undefined }
}
