import { ResultAsync, ok } from "neverthrow"

export interface PythonExecResult {
  outputCsv: string
}

// TODO: implement actual Python execution
export function safeExecPython(
  inputCsv: string,
  _script: string,
): ResultAsync<PythonExecResult, string> {
  return ResultAsync.fromSafePromise(
    Promise.resolve(
      ok<PythonExecResult, string>({
        outputCsv: inputCsv,
      }),
    ),
  ).andThen(r => r)
}
