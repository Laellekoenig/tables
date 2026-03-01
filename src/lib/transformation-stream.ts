import { err, ok, type Result } from "neverthrow"
import { z } from "zod"
import {
  transformationPhases,
  type TransformationStatus,
} from "@/src/db/schemas/transformation-schema"

export const transformStreamEventSchema = z.object({
  transformationId: z.string().min(1),
  phase: z.enum(transformationPhases),
})

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
