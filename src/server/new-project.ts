"use server"

import { ResultAsync } from "neverthrow"
import { db } from "@/src/db"
import { project } from "@/src/db/schemas/project-schema"
import { ActionResult } from "@/src/types/action-result"
import { getAuthedSession } from "./auth-helper"
import {
  type CreateProjectInput,
  validateCreateProjectInput,
} from "@/src/lib/csv-validation"
import { type Project } from "./get-project"

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
