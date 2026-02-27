import { and, eq } from "drizzle-orm"
import { ResultAsync } from "neverthrow"
import { NextRequest, NextResponse } from "next/server"

import { db } from "@/src/db"
import { transformation } from "@/src/db/schemas/transformation-schema"
import {
  getAuthedSession,
  verifyProjectOwnership,
} from "@/src/server/auth-helper"
import { type Transformation } from "@/src/server/transformation-helpers"
import { ActionResult } from "@/src/types/action-result"

const POLL_INTERVAL_MS = 700

export async function GET(request: NextRequest) {
  const queryResult = getProgressQuery(request)
  if (!queryResult.ok) {
    return NextResponse.json({ error: queryResult.error }, { status: 400 })
  }

  const sessionResult = await getAuthedSession()
  if (sessionResult.isErr()) {
    return NextResponse.json({ error: "Not signed-in" }, { status: 401 })
  }

  const ownershipResult = await verifyProjectOwnership(
    queryResult.value.projectId,
    sessionResult.value.user.id,
  )
  if (!ownershipResult.ok) {
    return NextResponse.json({ error: ownershipResult.error }, { status: 404 })
  }

  const stream = buildProgressStream(
    request.signal,
    queryResult.value.transformationId,
    queryResult.value.projectId,
  )

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}

function getProgressQuery(
  request: NextRequest,
): ActionResult<{ transformationId: string; projectId: string }> {
  const transformationId = request.nextUrl.searchParams.get("transformationId")
  const projectId = request.nextUrl.searchParams.get("projectId")

  if (!transformationId) {
    return { ok: false, error: "transformationId is required." }
  }

  if (!projectId) {
    return { ok: false, error: "projectId is required." }
  }

  return {
    ok: true,
    value: {
      transformationId,
      projectId,
    },
  }
}

function buildProgressStream(
  signal: AbortSignal,
  transformationId: string,
  projectId: string,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      let closed = false
      let previousSignature = ""

      const emit = (event: string, data: unknown) => {
        if (closed) {
          return
        }

        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      const close = () => {
        if (closed) {
          return
        }

        closed = true
        clearInterval(intervalId)
        controller.close()
      }

      const tick = async () => {
        const rowResult = await getTransformationRow(
          transformationId,
          projectId,
        )
        if (!rowResult.ok) {
          emit("error", { message: rowResult.error })
          close()
          return
        }

        const row = rowResult.value
        const phase = getPhaseLabel(row)
        const signature = `${row.status}|${row.codeSnippet ? "1" : "0"}|${row.errorMessage ?? ""}`

        if (signature !== previousSignature) {
          previousSignature = signature
          emit("status", {
            transformation: row,
            status: row.status,
            phase,
          })
        }

        if (isTerminalStatus(row.status)) {
          emit("done", {
            transformation: row,
            status: row.status,
            phase,
          })
          close()
        }
      }

      const intervalId = setInterval(() => {
        void tick()
      }, POLL_INTERVAL_MS)

      signal.addEventListener("abort", () => {
        close()
      })

      void tick()
    },
    cancel() {
      return
    },
  })
}

async function getTransformationRow(
  transformationId: string,
  projectId: string,
): Promise<ActionResult<Transformation>> {
  const rowResult = await ResultAsync.fromPromise(
    db
      .select()
      .from(transformation)
      .where(
        and(
          eq(transformation.id, transformationId),
          eq(transformation.projectId, projectId),
        ),
      )
      .limit(1),
    () => "Failed to fetch transformation progress.",
  ).map(rows => rows[0])

  if (rowResult.isErr() || !rowResult.value) {
    return { ok: false, error: "Failed to fetch transformation progress." }
  }

  return { ok: true, value: rowResult.value }
}

function getPhaseLabel(row: Transformation): string {
  if (row.status === "pending") {
    if (row.codeSnippet) {
      return "Awaiting approval"
    }

    return "Generating transformation code"
  }

  if (row.status === "running") {
    return "Executing transformation"
  }

  if (row.status === "completed") {
    return "Completed"
  }

  if (row.status === "error") {
    if (row.errorMessage === "Execution declined by user.") {
      return "Declined"
    }

    return "Failed"
  }

  return "Stale"
}

function isTerminalStatus(status: Transformation["status"]): boolean {
  if (status === "completed") {
    return true
  }

  if (status === "error") {
    return true
  }

  if (status === "stale") {
    return true
  }

  return false
}
