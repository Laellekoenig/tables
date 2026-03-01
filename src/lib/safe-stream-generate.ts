import { streamText } from "ai"
import { Result } from "neverthrow"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { env } from "@/src/env"

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
})

export function safeStreamGenerateText(
  systemPrompt: string,
  userPrompt: string,
): Result<ReturnType<typeof streamText>, string> {
  return createTextStream({ systemPrompt, userPrompt })
}

const createTextStream = Result.fromThrowable(
  ({
    systemPrompt,
    userPrompt,
  }: {
    systemPrompt: string
    userPrompt: string
  }) =>
    streamText({
      model: openrouter("openai/gpt-5.2-codex"),
      system: systemPrompt,
      prompt: userPrompt,
    }),
  (error: unknown) => {
    console.error("[safeStreamGenerateText] Generation failed:", error)
    return "Failed to generate text."
  },
)
