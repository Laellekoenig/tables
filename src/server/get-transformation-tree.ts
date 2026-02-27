"use server"

import { ResultAsync } from "neverthrow"
import { eq } from "drizzle-orm"
import { db } from "@/src/db"
import { transformation } from "@/src/db/schemas/transformation-schema"
import { ActionResult } from "@/src/types/action-result"
import { getAuthedSession, verifyProjectOwnership } from "./auth-helper"
import { type TransformationTree, buildTree } from "./transformation-helpers"

export async function serverGetTransformationTree(
  projectId: string,
): Promise<ActionResult<TransformationTree[]>> {
  const sessionResult = await getAuthedSession()
  if (sessionResult.isErr()) {
    return { ok: false, error: "Not signed-in" }
  }

  const session = sessionResult.value

  const ownershipResult = await verifyProjectOwnership(
    projectId,
    session.user.id,
  )
  if (!ownershipResult.ok) {
    return ownershipResult
  }

  const dbResult = await ResultAsync.fromPromise(
    db
      .select()
      .from(transformation)
      .where(eq(transformation.projectId, projectId)),
    () => "Failed to fetch transformations.",
  )

  if (dbResult.isErr()) {
    return { ok: false, error: dbResult.error }
  }

  return { ok: true, value: buildTree(dbResult.value) }
}
