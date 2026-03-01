import "server-only"

import { eq } from "drizzle-orm"
import { err, ok, ResultAsync, type Result } from "neverthrow"
import { db } from "@/src/db"
import { project } from "@/src/db/schemas/project-schema"

export async function getProjectSnapshot(
  projectId: string,
  userId: string,
): Promise<Result<void, string>> {
  const projectResult = await ResultAsync.fromPromise(
    db
      .select({
        userId: project.userId,
      })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1),
    () => "Failed to fetch project.",
  ).map(rows => rows[0])

  if (projectResult.isErr()) {
    return err(projectResult.error)
  }

  if (!projectResult.value) {
    return err("Project not found.")
  }

  if (projectResult.value.userId !== userId) {
    return err("Project not found.")
  }

  return ok(undefined)
}
