"use server"

import { ResultAsync } from "neverthrow"
import { eq, desc } from "drizzle-orm"
import { db } from "@/src/db"
import { project } from "@/src/db/schemas/project-schema"
import { ActionResult } from "@/src/types/action-result"
import { getAuthedSession } from "./auth-helper"
import { type Project } from "./get-project"

export async function serverGetProjects(): Promise<ActionResult<Project[]>> {
  const sessionResult = await getAuthedSession()
  if (sessionResult.isErr()) {
    return { ok: false, error: "Not signed-in" }
  }

  const session = sessionResult.value

  const dbResult = await ResultAsync.fromPromise(
    db
      .select()
      .from(project)
      .where(eq(project.userId, session.user.id))
      .orderBy(desc(project.createdAt)),
    () => "Failed to fetch projects",
  )

  if (dbResult.isErr()) {
    return { ok: false, error: dbResult.error }
  }

  return { ok: true, value: dbResult.value }
}
