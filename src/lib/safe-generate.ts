import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { ResultAsync } from "neverthrow"

import { env } from "@/src/env"

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
})

export function safeGenerateText(
  systemPrompt: string,
  userPrompt: string,
): ResultAsync<string, string> {
  return ResultAsync.fromPromise(
    generateText({
      model: openrouter("openai/gpt-5.2-codex"),
      system: systemPrompt,
      prompt: userPrompt,
    }).then(result => result.text),
    (error: unknown) => {
      console.error("[safeGenerateText] Generation failed:", error)
      return "Failed to generate text."
    },
  )
}
