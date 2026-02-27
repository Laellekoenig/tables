import { ResultAsync } from "neverthrow"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/src/db"
import { project } from "@/src/db/schemas/project-schema"
import { transformation } from "@/src/db/schemas/transformation-schema"
import { ActionResult } from "@/src/types/action-result"
import { safeExecPython } from "@/src/lib/safe-exec-python"

export const SYSTEM_PROMPT = `You are a data transformation assistant. Generate a Python script that:
- Imports pandas and numpy
- Reads a CSV file from "data.csv" using pandas
- Applies the transformation described by the user
- Saves the transformed data to "transformed.csv" using pandas

Output ONLY the Python script. No markdown, no explanations, no code fences.`

export type Transformation = typeof transformation.$inferSelect

export interface TransformationTree {
  node: Transformation
  children: TransformationTree[]
}

export function buildTree(rows: Transformation[]): TransformationTree[] {
  const childrenMap = new Map<string | null, Transformation[]>()

  for (const row of rows) {
    const key = row.parentId
    const existing = childrenMap.get(key)
    if (existing) {
      existing.push(row)
    } else {
      childrenMap.set(key, [row])
    }
  }

  function recurse(parentId: string | null): TransformationTree[] {
    const children = childrenMap.get(parentId) ?? []
    return children.map(child => ({
      node: child,
      children: recurse(child.id),
    }))
  }

  return recurse(null)
}

export function collectDescendantIds(
  rows: Transformation[],
  rootId: string,
): string[] {
  const childrenMap = new Map<string, Transformation[]>()

  for (const row of rows) {
    if (row.parentId) {
      const existing = childrenMap.get(row.parentId)
      if (existing) {
        existing.push(row)
      } else {
        childrenMap.set(row.parentId, [row])
      }
    }
  }

  const ids: string[] = []

  function walk(parentId: string) {
    const children = childrenMap.get(parentId) ?? []
    for (const child of children) {
      ids.push(child.id)
      walk(child.id)
    }
  }

  walk(rootId)
  return ids
}

export async function getInputCsvForTransformation(
  t: Transformation,
): Promise<ActionResult<string>> {
  if (!t.parentId) {
    const dbResult = await ResultAsync.fromPromise(
      db
        .select({ csvContent: project.csvContent })
        .from(project)
        .where(eq(project.id, t.projectId))
        .limit(1),
      () => "Failed to fetch project CSV.",
    ).map(rows => rows[0])

    if (dbResult.isErr()) {
      return { ok: false, error: dbResult.error }
    }

    if (!dbResult.value) {
      return { ok: false, error: "Project not found." }
    }

    return { ok: true, value: dbResult.value.csvContent }
  }

  const dbResult = await ResultAsync.fromPromise(
    db
      .select({ outputCsv: transformation.outputCsv })
      .from(transformation)
      .where(eq(transformation.id, t.parentId))
      .limit(1),
    () => "Failed to fetch parent transformation.",
  ).map(rows => rows[0])

  if (dbResult.isErr()) {
    return { ok: false, error: dbResult.error }
  }

  if (!dbResult.value?.outputCsv) {
    return { ok: false, error: "Parent transformation has no output." }
  }

  return { ok: true, value: dbResult.value.outputCsv }
}

export async function executeTransformation(
  id: string,
  inputCsv: string,
  codeSnippet: string,
): Promise<ActionResult<{ outputCsv: string }>> {
  await ResultAsync.fromPromise(
    db
      .update(transformation)
      .set({ status: "running", errorMessage: null })
      .where(eq(transformation.id, id)),
    () => "Failed to update status to running.",
  )

  const execResult = await safeExecPython(inputCsv, codeSnippet)

  if (execResult.isErr()) {
    await ResultAsync.fromPromise(
      db
        .update(transformation)
        .set({
          status: "error",
          errorMessage: execResult.error,
          lastExecutedAt: new Date(),
        })
        .where(eq(transformation.id, id)),
      () => "Failed to update error status.",
    )
    return { ok: false, error: execResult.error }
  }

  const { outputCsv } = execResult.value

  await ResultAsync.fromPromise(
    db
      .update(transformation)
      .set({
        status: "completed",
        outputCsv,
        errorMessage: null,
        lastExecutedAt: new Date(),
      })
      .where(eq(transformation.id, id)),
    () => "Failed to update completed status.",
  )

  return { ok: true, value: { outputCsv } }
}

export async function cascadeReExecute(
  allRows: Transformation[],
  parentId: string,
  parentOutputCsv: string,
): Promise<void> {
  const childrenMap = new Map<string, Transformation[]>()

  for (const row of allRows) {
    if (row.parentId) {
      const existing = childrenMap.get(row.parentId)
      if (existing) {
        existing.push(row)
      } else {
        childrenMap.set(row.parentId, [row])
      }
    }
  }

  const children = childrenMap.get(parentId) ?? []

  for (const child of children) {
    if (!child.codeSnippet) {
      continue
    }

    const result = await executeTransformation(
      child.id,
      parentOutputCsv,
      child.codeSnippet,
    )

    if (result.ok) {
      await cascadeReExecute(allRows, child.id, result.value.outputCsv)
    } else {
      // Mark all descendants as stale
      const descendantIds = collectDescendantIds(allRows, child.id)
      if (descendantIds.length > 0) {
        await ResultAsync.fromPromise(
          db
            .update(transformation)
            .set({ status: "stale" })
            .where(inArray(transformation.id, descendantIds)),
          () => "Failed to mark descendants as stale.",
        )
      }
    }
  }
}
