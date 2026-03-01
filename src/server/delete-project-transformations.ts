"use server"

import { eq } from "drizzle-orm"
import { ResultAsync } from "neverthrow"
import { db } from "@/src/db"
import { transformation } from "@/src/db/schemas/transformation-schema"
import { ActionResult } from "@/src/types/action-result"
import { getAuthedSession, verifyProjectOwnership } from "./auth-helper"

export async function serverDeleteProjectTransformations(
  projectId: string,
): Promise<ActionResult<{ deletedCount: number }>> {
  const sessionResult = await getAuthedSession()

  if (sessionResult.isErr()) {
    return { ok: false, error: "Not signed-in" }
  }

  const ownershipResult = await verifyProjectOwnership(
    projectId,
    sessionResult.value.user.id,
  )

  if (!ownershipResult.ok) {
    return ownershipResult
  }

  const deleteResult = await ResultAsync.fromPromise(
    db
      .delete(transformation)
      .where(eq(transformation.projectId, projectId))
      .returning({ id: transformation.id }),
    () => "Failed to delete transformations.",
  )

  if (deleteResult.isErr()) {
    return { ok: false, error: deleteResult.error }
  }

  return {
    ok: true,
    value: { deletedCount: deleteResult.value.length },
  }
}
