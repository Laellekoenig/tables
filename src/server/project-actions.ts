"use server"

import { ResultAsync } from "neverthrow"
import { eq, desc } from "drizzle-orm"
import { db } from "@/src/db"
import { project } from "@/src/db/schemas/project-schema"
import { ActionResult } from "@/src/types/action-result"
import { getAuthedSession } from "./auth-helper"
import {
  type CreateProjectInput,
  validateCreateProjectInput,
} from "@/src/lib/csv-validation"

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

export async function serverNewProject(
  input: CreateProjectInput,
): Promise<ActionResult<Project>> {
  const sessionResult = await getAuthedSession()
  if (sessionResult.isErr()) {
    return { ok: false, error: "Not signed-in" }
  }

  const validationResult = validateCreateProjectInput(input)
  if (validationResult.isErr()) {
    return { ok: false, error: validationResult.error }
  }

  const { name, csvContent } = validationResult.value
  const session = sessionResult.value
  const id = crypto.randomUUID()

  const dbResult = await ResultAsync.fromPromise(
    db
      .insert(project)
      .values({
        id,
        name,
        csvContent,
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
