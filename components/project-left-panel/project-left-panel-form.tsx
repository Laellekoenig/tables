"use client"

import { type ComponentProps, useRef } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type PromptEditorHandle, PromptEditor } from "./prompt-editor"
import { useProjectLeftPanel } from "./project-left-panel-provider"

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0]

export function ProjectLeftPanelForm() {
  const { isSubmitting, isSubmitDisabled, submitPrompt } = useProjectLeftPanel()
  const editorRef = useRef<PromptEditorHandle>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: FormSubmitEvent) {
    e.preventDefault()

    if (!editorRef.current) {
      return
    }

    const prompt = editorRef.current.serialize().trim()
    if (!prompt) {
      return
    }

    const wasSubmitted = await submitPrompt(prompt)
    if (!wasSubmitted) {
      return
    }

    editorRef.current.clear()
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="bg-background/95 flex flex-col gap-2 p-6 border-b"
    >
      <PromptEditor
        ref={editorRef}
        disabled={isSubmitDisabled}
        onRequestSubmit={() => {
          formRef.current?.requestSubmit()
        }}
      />

      <Button
        type="submit"
        disabled={isSubmitDisabled}
        className="cursor-pointer self-end"
      >
        {isSubmitting ?
          <Loader2 className="animate-spin" />
        : "Submit"}
      </Button>
    </form>
  )
}
