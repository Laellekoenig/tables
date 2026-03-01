import { ResultAsync } from "neverthrow"

export function safeRequestJson<T>(request: Request): ResultAsync<T, string> {
  return ResultAsync.fromPromise(
    request.json() as Promise<T>,
    () => "Invalid JSON body.",
  )
}
