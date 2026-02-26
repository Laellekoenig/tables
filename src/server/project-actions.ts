"use server"

import { ResultAsync } from "neverthrow"
import { eq, desc } from "drizzle-orm"
import { db } from "@/src/db"
import { project } from "@/src/db/schemas/project-schema"
import { ActionResult } from "@/src/types/action-result"
import { getAuthedSession } from "./auth-helper"

export type Project = typeof project.$inferSelect

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

export async function serverNewProject(): Promise<ActionResult<Project>> {
  const sessionResult = await getAuthedSession()
  if (sessionResult.isErr()) {
    return { ok: false, error: "Not signed-in" }
  }

  const session = sessionResult.value
  const id = crypto.randomUUID()

  const dbResult = await ResultAsync.fromPromise(
    db
      .insert(project)
      .values({
        id,
        name: "Untitled Project",
        userId: session.user.id,
      })
      .returning(),
    () => "Failed to create project",
  ).map(rows => rows[0])

  if (dbResult.isErr()) {
    return { ok: false, error: dbResult.error }
  }

  return { ok: true, value: dbResult.value }
}
