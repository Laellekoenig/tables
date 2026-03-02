import { err, ok, type Result } from "neverthrow"
import { z } from "zod"
import {
  transformationPhases,
  type TransformationStatus,
} from "@/src/db/schemas/transformation-schema"

const transformPhaseStreamEventSchema = z.object({
  type: z.literal("phase"),
  transformationId: z.string().min(1),
  phase: z.enum(transformationPhases),
})

const transformCodeStreamEventSchema = z.object({
  type: z.literal("code"),
  transformationId: z.string().min(1),
  code: z.string(),
})

const transformCsvStreamEventSchema = z.object({
  type: z.literal("csv"),
  transformationId: z.string().min(1),
  csv: z.string(),
})

const transformExplanationStreamEventSchema = z.object({
  type: z.literal("explanation"),
  transformationId: z.string().min(1),
  explanation: z.string(),
})

export const transformStreamEventSchema = z.discriminatedUnion("type", [
  transformPhaseStreamEventSchema,
  transformCodeStreamEventSchema,
  transformCsvStreamEventSchema,
  transformExplanationStreamEventSchema,
])

export type TransformStreamEvent = z.infer<typeof transformStreamEventSchema>

export function safeParseTransformStreamEvent(
  value: unknown,
): Result<TransformStreamEvent, string> {
  const parseResult = transformStreamEventSchema.safeParse(value)

  if (!parseResult.success) {
    return err("Invalid transformation stream event.")
  }

  return ok(parseResult.data)
}

export function getTransformationPhaseIndex(
  phase: TransformationStatus,
): number {
  if (phase === "done") {
    return transformationPhases.length - 1
  }

  return transformationPhases.indexOf(phase)
}
