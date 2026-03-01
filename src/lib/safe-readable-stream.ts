import { err, ok, type Result, ResultAsync } from "neverthrow"

export function safeGetReader(
  response: Response,
): Result<ReadableStreamDefaultReader<Uint8Array>, string> {
  if (!response.body) {
    return err("Response body is missing.")
  }

  return ok(response.body.getReader())
}

export function safeReadChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): ResultAsync<ReadableStreamReadResult<Uint8Array>, string> {
  return ResultAsync.fromPromise(
    reader.read(),
    () => "Failed to read transformation stream.",
  )
}
