import { Result } from "neverthrow"

const createEventSource = Result.fromThrowable(
  (url: string) => new EventSource(url),
  () => "Failed to open progress stream.",
)

const parseJson = Result.fromThrowable(
  (value: string) => JSON.parse(value) as unknown,
  () => "Failed to parse progress stream payload.",
)

export function safeCreateEventSource(
  url: string,
): Result<EventSource, string> {
  return createEventSource(url)
}

export function safeParseJson<T>(value: string): Result<T, string> {
  return parseJson(value).map(parsed => parsed as T)
}
