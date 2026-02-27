"use client"

import { useRef, useState } from "react"

import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { safeFetch } from "@/src/lib/safe-fetch"
import { useProject } from "@/src/hooks/use-project"

export function ProjectRightPanel() {
  const { project } = useProject()
  const [prompt, setPrompt] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!prompt.trim()) {
      return
    }

    setIsLoading(true)

    const result = await safeFetch("/api/transform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, projectId: project.id }),
    })

    setIsLoading(false)

    if (result.isOk()) {
      setPrompt("")
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="flex flex-col p-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2"
      >
        <Textarea
          ref={textareaRef}
          value={prompt}
          disabled={isLoading}
          onChange={e => {
            setPrompt(e.target.value)
          }}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
          onDragOver={e => {
            e.preventDefault()
            e.dataTransfer.dropEffect = "copy"
          }}
          onDragEnter={() => {
            setIsDragOver(true)
          }}
          onDragLeave={() => {
            setIsDragOver(false)
          }}
          onDrop={e => {
            e.preventDefault()
            setIsDragOver(false)
            const droppedText = e.dataTransfer.getData("text/plain")
            if (!droppedText) {
              return
            }
            const textarea = textareaRef.current
            if (!textarea) {
              return
            }
            const cursorPos = textarea.selectionStart
            const newValue =
              prompt.slice(0, cursorPos) + droppedText + prompt.slice(cursorPos)
            setPrompt(newValue)
            requestAnimationFrame(() => {
              textarea.focus()
              const newCursorPos = cursorPos + droppedText.length
              textarea.setSelectionRange(newCursorPos, newCursorPos)
            })
          }}
          className={isDragOver ? "border-primary ring-2 ring-primary/30" : ""}
          placeholder="Explain transformation..."
        />

        <Button
          type="submit"
          disabled={isLoading}
          className="cursor-pointer self-end"
        >
          {isLoading ?
            <Loader2 className="animate-spin" />
          : "Submit"}
        </Button>
      </form>
    </div>
  )
}
