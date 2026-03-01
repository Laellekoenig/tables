"use server"

import { desc, eq } from "drizzle-orm"
import { ResultAsync } from "neverthrow"
import { db } from "@/src/db"
import { transformation } from "@/src/db/schemas/transformation-schema"
import { ActionResult } from "@/src/types/action-result"
import { getAuthedSession, verifyProjectOwnership } from "./auth-helper"

export type ServerTransformation = typeof transformation.$inferSelect

export async function serverGetTransformations(
  projectId: string,
): Promise<ActionResult<ServerTransformation[]>> {
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

  const dbResult = await ResultAsync.fromPromise(
    db
      .select()
      .from(transformation)
      .where(eq(transformation.projectId, projectId))
      .orderBy(desc(transformation.createdAt)),
    () => "Failed to fetch transformations.",
  )

  if (dbResult.isErr()) {
    return { ok: false, error: dbResult.error }
  }

  return { ok: true, value: dbResult.value }
}
