"use server"

import { ResultAsync } from "neverthrow"
import { eq } from "drizzle-orm"
import { db } from "@/src/db"
import { project } from "@/src/db/schemas/project-schema"
import { ActionResult } from "@/src/types/action-result"
import { getAuthedSession } from "./auth-helper"

export type Project = typeof project.$inferSelect

export async function serverGetProject(
  id: string,
): Promise<ActionResult<Project>> {
  const sessionResult = await getAuthedSession()
  if (sessionResult.isErr()) {
    return { ok: false, error: "Not signed-in" }
  }

  const session = sessionResult.value

  const dbResult = await ResultAsync.fromPromise(
    db.select().from(project).where(eq(project.id, id)).limit(1),
    () => "Failed to fetch project",
  ).map(rows => rows[0])

  if (dbResult.isErr()) {
    return { ok: false, error: dbResult.error }
  }

  if (!dbResult.value) {
    return { ok: false, error: "Project not found" }
  }

  if (dbResult.value.userId !== session.user.id) {
    return { ok: false, error: "Project not found" }
  }

  return { ok: true, value: dbResult.value }
}
