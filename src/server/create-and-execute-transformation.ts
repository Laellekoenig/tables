"use server"

import { and, eq } from "drizzle-orm"
import { ResultAsync } from "neverthrow"

import { db } from "@/src/db"
import { project } from "@/src/db/schemas/project-schema"
import { transformation } from "@/src/db/schemas/transformation-schema"
import { csvSampleLines } from "@/src/lib/csv-parsing"
import { safeGenerateText } from "@/src/lib/safe-generate"
import { ActionResult } from "@/src/types/action-result"

import { getAuthedSession, verifyProjectOwnership } from "./auth-helper"
import {
  executeTransformation,
  type Transformation,
  SYSTEM_PROMPT,
} from "./transformation-helpers"

export async function serverCreateTransformation(input: {
  projectId: string
  parentId: string | null
  prompt: string
}): Promise<ActionResult<Transformation>> {
  const sessionResult = await getAuthedSession()
  if (sessionResult.isErr()) {
    return { ok: false, error: "Not signed-in" }
  }

  const ownershipResult = await verifyProjectOwnership(
    input.projectId,
    sessionResult.value.user.id,
  )
  if (!ownershipResult.ok) {
    return ownershipResult
  }

  const parentResult = await getParentIdForNextTransformation(input.projectId)
  if (!parentResult.ok) {
    return parentResult
  }

  const id = crypto.randomUUID()

  const insertResult = await ResultAsync.fromPromise(
    db
      .insert(transformation)
      .values({
        id,
        projectId: input.projectId,
        parentId: parentResult.value,
        prompt: input.prompt,
        status: "pending",
      })
      .returning(),
    () => "Failed to create transformation.",
  ).map(rows => rows[0])

  if (insertResult.isErr() || !insertResult.value) {
    return { ok: false, error: "Failed to create transformation." }
  }

  return { ok: true, value: insertResult.value }
}

export async function serverGenerateTransformationCode(input: {
  projectId: string
  transformationId: string
}): Promise<ActionResult<Transformation>> {
  const sessionResult = await getAuthedSession()
  if (sessionResult.isErr()) {
    return { ok: false, error: "Not signed-in" }
  }

  const ownershipResult = await verifyProjectOwnership(
    input.projectId,
    sessionResult.value.user.id,
  )
  if (!ownershipResult.ok) {
    return ownershipResult
  }

  const rowResult = await getTransformationForExecution(
    input.transformationId,
    input.projectId,
  )
  if (!rowResult.ok) {
    return rowResult
  }

  if (rowResult.value.status !== "pending") {
    return { ok: true, value: rowResult.value }
  }

  const inputCsvResult = await getInputCsvForNewTransformation(rowResult.value)
  if (!inputCsvResult.ok) {
    await updateTransformationToError(rowResult.value.id, inputCsvResult.error)
    return getTransformationById(rowResult.value.id)
  }

  const sample = csvSampleLines(inputCsvResult.value)
  const augmentedPrompt = `Here is a sample of the CSV data:\n${sample}\n\nTransformation request: ${rowResult.value.prompt}`

  const generateResult = await safeGenerateText(SYSTEM_PROMPT, augmentedPrompt)

  if (generateResult.isErr()) {
    await updateTransformationToError(rowResult.value.id, generateResult.error)
    return getTransformationById(rowResult.value.id)
  }

  await ResultAsync.fromPromise(
    db
      .update(transformation)
      .set({
        codeSnippet: generateResult.value,
        errorMessage: null,
      })
      .where(eq(transformation.id, rowResult.value.id)),
    () => "Failed to save code snippet.",
  )

  return getTransformationById(rowResult.value.id)
}

export async function serverRunTransformation(input: {
  projectId: string
  transformationId: string
}): Promise<ActionResult<Transformation>> {
  const sessionResult = await getAuthedSession()
  if (sessionResult.isErr()) {
    return { ok: false, error: "Not signed-in" }
  }

  const ownershipResult = await verifyProjectOwnership(
    input.projectId,
    sessionResult.value.user.id,
  )
  if (!ownershipResult.ok) {
    return ownershipResult
  }

  const rowResult = await getTransformationForExecution(
    input.transformationId,
    input.projectId,
  )
  if (!rowResult.ok) {
    return rowResult
  }

  if (!rowResult.value.codeSnippet) {
    return {
      ok: false,
      error: "No generated code found. Generate code before running.",
    }
  }

  const inputCsvResult = await getInputCsvForNewTransformation(rowResult.value)
  if (!inputCsvResult.ok) {
    await updateTransformationToError(rowResult.value.id, inputCsvResult.error)
    return getTransformationById(rowResult.value.id)
  }

  const execResult = await executeTransformation(
    rowResult.value.id,
    inputCsvResult.value,
    rowResult.value.codeSnippet,
  )

  if (!execResult.ok) {
    return getTransformationById(rowResult.value.id)
  }

  return getTransformationById(rowResult.value.id)
}

export async function serverDeclineTransformation(input: {
  projectId: string
  transformationId: string
}): Promise<ActionResult<Transformation>> {
  const sessionResult = await getAuthedSession()
  if (sessionResult.isErr()) {
    return { ok: false, error: "Not signed-in" }
  }

  const ownershipResult = await verifyProjectOwnership(
    input.projectId,
    sessionResult.value.user.id,
  )
  if (!ownershipResult.ok) {
    return ownershipResult
  }

  const rowResult = await getTransformationForExecution(
    input.transformationId,
    input.projectId,
  )
  if (!rowResult.ok) {
    return rowResult
  }

  await updateTransformationToError(
    rowResult.value.id,
    "Execution declined by user.",
  )

  return getTransformationById(rowResult.value.id)
}

export async function serverExecuteTransformation(input: {
  projectId: string
  transformationId: string
}): Promise<ActionResult<Transformation>> {
  const generateResult = await serverGenerateTransformationCode(input)
  if (!generateResult.ok) {
    return generateResult
  }

  if (generateResult.value.status === "error") {
    return generateResult
  }

  return serverRunTransformation(input)
}

export async function serverCreateAndExecuteTransformation(input: {
  projectId: string
  parentId: string | null
  prompt: string
}): Promise<ActionResult<Transformation>> {
  const createResult = await serverCreateTransformation(input)
  if (!createResult.ok) {
    return createResult
  }

  const executeResult = await serverExecuteTransformation({
    projectId: input.projectId,
    transformationId: createResult.value.id,
  })
  if (!executeResult.ok) {
    return executeResult
  }

  return executeResult
}

async function getParentIdForNextTransformation(
  projectId: string,
): Promise<ActionResult<string | null>> {
  const rowsResult = await ResultAsync.fromPromise(
    db
      .select({
        id: transformation.id,
        status: transformation.status,
        outputCsv: transformation.outputCsv,
        lastExecutedAt: transformation.lastExecutedAt,
        updatedAt: transformation.updatedAt,
      })
      .from(transformation)
      .where(eq(transformation.projectId, projectId)),
    () => "Failed to determine transformation parent.",
  )

  if (rowsResult.isErr()) {
    return { ok: false, error: rowsResult.error }
  }

  if (rowsResult.value.some(item => isInFlightStatus(item.status))) {
    return {
      ok: false,
      error: "Finish the current transformation before creating a new one.",
    }
  }

  const latestCompleted = rowsResult.value
    .filter(item => item.status === "completed" && Boolean(item.outputCsv))
    .reduce<{
      id: string
      lastExecutedAt: Date | null
      updatedAt: Date
    } | null>((latest, item) => {
      if (!latest) {
        return item
      }

      if (
        getTransformationTimestamp(item) >= getTransformationTimestamp(latest)
      ) {
        return item
      }

      return latest
    }, null)

  if (!latestCompleted) {
    return { ok: true, value: null }
  }

  return { ok: true, value: latestCompleted.id }
}

function getTransformationTimestamp(row: {
  lastExecutedAt: Date | null
  updatedAt: Date
}): number {
  if (row.lastExecutedAt) {
    return row.lastExecutedAt.getTime()
  }

  return row.updatedAt.getTime()
}

function isInFlightStatus(status: Transformation["status"]): boolean {
  if (status === "pending") {
    return true
  }

  if (status === "running") {
    return true
  }

  return false
}

async function getInputCsvForNewTransformation(
  item: Pick<Transformation, "projectId" | "parentId">,
): Promise<ActionResult<string>> {
  if (!item.parentId) {
    const csvResult = await ResultAsync.fromPromise(
      db
        .select({ csvContent: project.csvContent })
        .from(project)
        .where(eq(project.id, item.projectId))
        .limit(1),
      () => "Failed to fetch project CSV.",
    ).map(rows => rows[0])

    if (csvResult.isErr() || !csvResult.value) {
      return { ok: false, error: "Failed to fetch project CSV." }
    }

    return { ok: true, value: csvResult.value.csvContent }
  }

  const parentResult = await ResultAsync.fromPromise(
    db
      .select({ outputCsv: transformation.outputCsv })
      .from(transformation)
      .where(eq(transformation.id, item.parentId))
      .limit(1),
    () => "Failed to fetch parent transformation.",
  ).map(rows => rows[0])

  if (parentResult.isErr()) {
    return { ok: false, error: parentResult.error }
  }

  if (!parentResult.value?.outputCsv) {
    return { ok: false, error: "Parent transformation has no output." }
  }

  return { ok: true, value: parentResult.value.outputCsv }
}

async function getTransformationForExecution(
  transformationId: string,
  projectId: string,
): Promise<ActionResult<Transformation>> {
  const rowResult = await ResultAsync.fromPromise(
    db
      .select()
      .from(transformation)
      .where(
        and(
          eq(transformation.id, transformationId),
          eq(transformation.projectId, projectId),
        ),
      )
      .limit(1),
    () => "Failed to fetch transformation.",
  ).map(rows => rows[0])

  if (rowResult.isErr() || !rowResult.value) {
    return { ok: false, error: "Failed to fetch transformation." }
  }

  return { ok: true, value: rowResult.value }
}

async function getTransformationById(
  transformationId: string,
): Promise<ActionResult<Transformation>> {
  const rowResult = await ResultAsync.fromPromise(
    db
      .select()
      .from(transformation)
      .where(eq(transformation.id, transformationId))
      .limit(1),
    () => "Failed to fetch transformation.",
  ).map(rows => rows[0])

  if (rowResult.isErr() || !rowResult.value) {
    return { ok: false, error: "Failed to fetch transformation." }
  }

  return { ok: true, value: rowResult.value }
}

async function updateTransformationToError(
  transformationId: string,
  message: string,
): Promise<void> {
  await ResultAsync.fromPromise(
    db
      .update(transformation)
      .set({
        status: "error",
        errorMessage: message,
        lastExecutedAt: new Date(),
      })
      .where(eq(transformation.id, transformationId)),
    () => "Failed to update transformation error status.",
  )
}
