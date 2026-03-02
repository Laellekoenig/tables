import "server-only"

import { eq } from "drizzle-orm"
import { err, ok, ResultAsync, type Result } from "neverthrow"
import { db } from "@/src/db"
import { project, transformation } from "@/src/db/schemas"

export async function getTransformationInputCsv(
  transformationId: string,
): Promise<Result<string, string>> {
  const transformationResult = await getTransformationRecord(transformationId)

  if (transformationResult.isErr()) {
    return err(transformationResult.error)
  }

  if (transformationResult.value.parentId) {
    return getParentTransformationCsv(transformationResult.value.parentId)
  }

  return getProjectCsv(transformationResult.value.projectId)
}

interface TransformationRecord {
  projectId: string
  parentId: string | null
}

async function getTransformationRecord(
  transformationId: string,
): Promise<Result<TransformationRecord, string>> {
  const recordResult = await ResultAsync.fromPromise(
    db
      .select({
        projectId: transformation.projectId,
        parentId: transformation.parentId,
      })
      .from(transformation)
      .where(eq(transformation.id, transformationId))
      .limit(1),
    () => "Failed to fetch transformation.",
  ).map(rows => rows[0])

  if (recordResult.isErr()) {
    return err(recordResult.error)
  }

  if (!recordResult.value) {
    return err("Transformation not found.")
  }

  return ok(recordResult.value)
}

async function getProjectCsv(
  projectId: string,
): Promise<Result<string, string>> {
  const projectResult = await ResultAsync.fromPromise(
    db
      .select({
        csvContent: project.csvContent,
      })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1),
    () => "Failed to fetch project CSV.",
  ).map(rows => rows[0])

  if (projectResult.isErr()) {
    return err(projectResult.error)
  }

  if (!projectResult.value) {
    return err("Project not found.")
  }

  return ok(projectResult.value.csvContent)
}

async function getParentTransformationCsv(
  parentId: string,
): Promise<Result<string, string>> {
  const parentResult = await ResultAsync.fromPromise(
    db
      .select({
        csvResult: transformation.csvResult,
      })
      .from(transformation)
      .where(eq(transformation.id, parentId))
      .limit(1),
    () => "Failed to fetch parent transformation CSV.",
  ).map(rows => rows[0])

  if (parentResult.isErr()) {
    return err(parentResult.error)
  }

  if (!parentResult.value) {
    return err("Parent transformation not found.")
  }

  if (parentResult.value.csvResult === null) {
    return err("Parent transformation CSV is missing.")
  }

  return ok(parentResult.value.csvResult)
}
