"use server"

import { ResultAsync } from "neverthrow"
import { eq } from "drizzle-orm"
import { db } from "@/src/db"
import { project } from "@/src/db/schemas/project-schema"
import { transformation } from "@/src/db/schemas/transformation-schema"
import { ActionResult } from "@/src/types/action-result"
import { getAuthedSession, verifyProjectOwnership } from "./auth-helper"
import { safeGenerateText } from "@/src/lib/safe-generate"
import {
  type Transformation,
  SYSTEM_PROMPT,
  executeTransformation,
} from "./transformation-helpers"

export async function serverCreateAndExecuteTransformation(input: {
  projectId: string
  parentId: string | null
  prompt: string
}): Promise<ActionResult<Transformation>> {
  const sessionResult = await getAuthedSession()
  if (sessionResult.isErr()) {
    return { ok: false, error: "Not signed-in" }
  }

  const session = sessionResult.value

  const ownershipResult = await verifyProjectOwnership(
    input.projectId,
    session.user.id,
  )
  if (!ownershipResult.ok) {
    return ownershipResult
  }

  // Determine input CSV
  let inputCsv: string

  if (!input.parentId) {
    const csvResult = await ResultAsync.fromPromise(
      db
        .select({ csvContent: project.csvContent })
        .from(project)
        .where(eq(project.id, input.projectId))
        .limit(1),
      () => "Failed to fetch project CSV.",
    ).map(rows => rows[0])

    if (csvResult.isErr() || !csvResult.value) {
      return { ok: false, error: "Failed to fetch project CSV." }
    }

    inputCsv = csvResult.value.csvContent
  } else {
    const parentResult = await ResultAsync.fromPromise(
      db
        .select({ outputCsv: transformation.outputCsv })
        .from(transformation)
        .where(eq(transformation.id, input.parentId))
        .limit(1),
      () => "Failed to fetch parent transformation.",
    ).map(rows => rows[0])

    if (parentResult.isErr()) {
      return { ok: false, error: parentResult.error }
    }

    if (!parentResult.value?.outputCsv) {
      return { ok: false, error: "Parent transformation has no output." }
    }

    inputCsv = parentResult.value.outputCsv
  }

  // Create the transformation record
  const id = crypto.randomUUID()

  const insertResult = await ResultAsync.fromPromise(
    db
      .insert(transformation)
      .values({
        id,
        projectId: input.projectId,
        parentId: input.parentId,
        prompt: input.prompt,
        status: "pending",
      })
      .returning(),
    () => "Failed to create transformation.",
  ).map(rows => rows[0])

  if (insertResult.isErr()) {
    return { ok: false, error: insertResult.error }
  }

  // Generate code via LLM
  const generateResult = await safeGenerateText(SYSTEM_PROMPT, input.prompt)

  if (generateResult.isErr()) {
    await ResultAsync.fromPromise(
      db
        .update(transformation)
        .set({ status: "error", errorMessage: generateResult.error })
        .where(eq(transformation.id, id)),
      () => "Failed to update error status.",
    )
    return { ok: false, error: generateResult.error }
  }

  const codeSnippet = generateResult.value

  await ResultAsync.fromPromise(
    db
      .update(transformation)
      .set({ codeSnippet })
      .where(eq(transformation.id, id)),
    () => "Failed to save code snippet.",
  )

  // Execute the Python script
  const execResult = await executeTransformation(id, inputCsv, codeSnippet)

  if (!execResult.ok) {
    // Fetch the updated record (with error status)
    const failedResult = await ResultAsync.fromPromise(
      db
        .select()
        .from(transformation)
        .where(eq(transformation.id, id))
        .limit(1),
      () => "Failed to fetch transformation.",
    ).map(rows => rows[0])

    if (failedResult.isErr() || !failedResult.value) {
      return { ok: false, error: execResult.error }
    }

    return { ok: true, value: failedResult.value }
  }

  // Fetch the completed record
  const finalResult = await ResultAsync.fromPromise(
    db.select().from(transformation).where(eq(transformation.id, id)).limit(1),
    () => "Failed to fetch transformation.",
  ).map(rows => rows[0])

  if (finalResult.isErr() || !finalResult.value) {
    return { ok: false, error: "Failed to fetch created transformation." }
  }

  return { ok: true, value: finalResult.value }
}
