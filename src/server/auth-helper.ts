import { headers } from "next/headers"
import { err, ok, Result, ResultAsync } from "neverthrow"
import { eq } from "drizzle-orm"
import { auth } from "@/src/auth"
import { db } from "@/src/db"
import { project } from "@/src/db/schemas/project-schema"
import { ActionResult } from "@/src/types/action-result"

export type Session = typeof auth.$Infer.Session

export async function getAuthedSession(): Promise<Result<Session, string>> {
  const headersResult = await ResultAsync.fromPromise(
    headers(),
    () => "Failed to get headers.",
  )

  if (headersResult.isErr()) {
    return err(headersResult.error)
  }

  const sessionResult = await ResultAsync.fromPromise(
    auth.api.getSession({ headers: headersResult.value }),
    () => "Failed to get session.",
  )

  if (sessionResult.isErr()) {
    return err(sessionResult.error)
  }

  if (!sessionResult.value) {
    return err("Not authenticated.")
  }

  return ok(sessionResult.value)
}

export async function verifyProjectOwnership(
  projectId: string,
  userId: string,
): Promise<ActionResult<void>> {
  const projectResult = await ResultAsync.fromPromise(
    db
      .select({ userId: project.userId })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1),
    () => "Failed to fetch project.",
  ).map(rows => rows[0])

  if (projectResult.isErr()) {
    return { ok: false, error: projectResult.error }
  }

  if (!projectResult.value || projectResult.value.userId !== userId) {
    return { ok: false, error: "Project not found." }
  }

  return { ok: true, value: undefined }
}
