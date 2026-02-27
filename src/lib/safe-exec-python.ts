import "server-only"

import { Daytona, Sandbox } from "@daytonaio/sdk"
import { err, ok, Result, ResultAsync } from "neverthrow"
import { env } from "@/src/env"

const SANDBOX_TIMEOUT_S = 30
const INPUT_CSV_PATH = "data.csv"
const SCRIPT_PATH = "script.py"
const OUTPUT_CSV_PATH = "transformed.csv"

export interface PythonExecResult {
  outputCsv: string
}

export function safeExecPython(
  inputCsv: string,
  script: string,
): ResultAsync<PythonExecResult, string> {
  return ResultAsync.fromPromise(
    executePythonInSandbox(inputCsv, script),
    () => "Unexpected error during Python execution.",
  ).andThen(r => r)
}

async function executePythonInSandbox(
  inputCsv: string,
  script: string,
): Promise<Result<PythonExecResult, string>> {
  const sandboxResult = await createSandbox()
  if (sandboxResult.isErr()) {
    return err(sandboxResult.error)
  }
  const { daytona, sandbox } = sandboxResult.value

  const uploadResult = await ResultAsync.fromPromise(
    sandbox.fs
      .uploadFile(Buffer.from(inputCsv), INPUT_CSV_PATH)
      .then(() => sandbox.fs.uploadFile(Buffer.from(script), SCRIPT_PATH)),
    () => "Failed to upload files to sandbox.",
  )
  if (uploadResult.isErr()) {
    await deleteSandbox(daytona, sandbox)
    return err(uploadResult.error)
  }

  const execResult = await ResultAsync.fromPromise(
    sandbox.process.executeCommand(
      `python3 ${SCRIPT_PATH} 2>&1`,
      undefined,
      undefined,
      SANDBOX_TIMEOUT_S,
    ),
    () => "Failed to execute Python script.",
  )
  if (execResult.isErr()) {
    await deleteSandbox(daytona, sandbox)
    return err(execResult.error)
  }

  if (execResult.value.exitCode !== 0) {
    await deleteSandbox(daytona, sandbox)
    return err(`Python script failed:\n${execResult.value.result}`)
  }

  const downloadResult = await ResultAsync.fromPromise(
    sandbox.fs.downloadFile(OUTPUT_CSV_PATH),
    () => "Failed to download transformed CSV.",
  )
  await deleteSandbox(daytona, sandbox)

  if (downloadResult.isErr()) {
    return err(downloadResult.error)
  }

  const outputCsv = downloadResult.value.toString("utf-8")
  if (!outputCsv.trim()) {
    return err("Python script produced an empty output file.")
  }

  return ok({ outputCsv })
}

async function createSandbox(): Promise<
  Result<{ daytona: Daytona; sandbox: Sandbox }, string>
> {
  const daytona = new Daytona({ apiKey: env.DAYTONA_API_KEY, target: "eu" })

  const result = await ResultAsync.fromPromise(
    daytona.create({
      language: "python",
      ephemeral: true,
      autoStopInterval: 1,
      autoDeleteInterval: 0,
      networkBlockAll: true,
      snapshot: "daytona-small",
    }),
    () => "Failed to create sandbox.",
  )

  if (result.isErr()) {
    return err(result.error)
  }

  return ok({ daytona, sandbox: result.value })
}

async function deleteSandbox(
  daytona: Daytona,
  sandbox: Sandbox,
): Promise<void> {
  try {
    await daytona.delete(sandbox)
  } catch {
    // Sandbox is ephemeral and will self-destruct
  }
}
