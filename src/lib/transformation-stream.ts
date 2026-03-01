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

export const transformStreamEventSchema = z.discriminatedUnion("type", [
  transformPhaseStreamEventSchema,
  transformCodeStreamEventSchema,
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
  return transformationPhases.indexOf(phase)
}
