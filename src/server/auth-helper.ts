import { headers } from "next/headers"
import { err, ok, Result, ResultAsync } from "neverthrow"
import { auth } from "@/src/auth"

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
