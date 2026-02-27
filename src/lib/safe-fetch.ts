import { err, ok, ResultAsync } from "neverthrow"

export function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): ResultAsync<Response, string> {
  return ResultAsync.fromPromise(
    fetch(input, init),
    () => "Network request failed.",
  ).andThen(response => {
    if (!response.ok) {
      return err(`Request failed with status ${response.status}.`)
    }

    return ok(response)
  })
}
