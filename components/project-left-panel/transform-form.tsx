"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTransformations } from "@/components/providers/transformations-provider"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function TransformForm() {
  const [text, setText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const { sendPrompt, isDeletingTransformations } = useTransformations()

  useEffect(() => {
    resizeTextarea(textareaRef.current)
  }, [text])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedText = text.trim()
    if (!trimmedText) {
      return
    }

    setIsSubmitting(true)
    const sendPromptResult = await sendPrompt(trimmedText)

    if (sendPromptResult.isErr()) {
      toast.error(sendPromptResult.error)
      setIsSubmitting(false)
      return
    }

    setText("")
    setIsSubmitting(false)
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="-mx-6 border-b border-border/70 px-6 pb-6 pt-4"
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Transform input
        </p>
      </div>

      <div className="mt-4">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => handleTextareaKeyDown(event, formRef.current)}
          rows={1}
          placeholder="Describe the transformation you want to run..."
          disabled={isSubmitting || isDeletingTransformations}
          className="resize-none overflow-hidden border-border/70 bg-background/80"
        />
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <Button
          type="submit"
          size="icon"
          disabled={isSubmitting || isDeletingTransformations || !text.trim()}
          className="cursor-pointer"
          aria-label="Submit"
        >
          {isSubmitting ?
            <Loader2 className="animate-spin" />
          : <ArrowUp />}
        </Button>
      </div>
    </form>
  )
}

function resizeTextarea(textarea: HTMLTextAreaElement | null): void {
  if (!textarea) {
    return
  }

  textarea.style.height = "auto"
  textarea.style.height = `${textarea.scrollHeight}px`
}

function handleTextareaKeyDown(
  event: React.KeyboardEvent<HTMLTextAreaElement>,
  form: HTMLFormElement | null,
): void {
  if (event.key !== "Enter") {
    return
  }

  if (event.shiftKey) {
    return
  }

  event.preventDefault()
  form?.requestSubmit()
}
