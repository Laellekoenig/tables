import "server-only"

import { eq } from "drizzle-orm"
import { err, ok, ResultAsync, type Result } from "neverthrow"
import { db } from "@/src/db"
import { project } from "@/src/db/schemas"

export async function getProjectCsv(
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
