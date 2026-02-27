"use client"

import { useRef, useState } from "react"

import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { safeFetch } from "@/src/lib/safe-fetch"
import { useProject } from "@/src/hooks/use-project"

export function ProjectRightPanel() {
  const { project } = useProject()
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const editor = editorRef.current
    if (!editor) {
      return
    }

    const prompt = serializeEditor(editor).trim()
    if (!prompt) {
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
      editor.innerHTML = ""
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
        <div
          ref={editorRef}
          contentEditable={!isLoading}
          data-placeholder="Explain transformation..."
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.closest("form")?.requestSubmit()
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
            const columnName = e.dataTransfer.getData("application/x-column")
            if (!columnName) {
              return
            }

            const range = document.caretRangeFromPoint(e.clientX, e.clientY)
            if (!range) {
              return
            }

            const badge = document.createElement("span")
            badge.contentEditable = "false"
            badge.dataset.column = columnName
            badge.textContent = columnName
            badge.className =
              "inline-flex items-center rounded-4xl bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium cursor-default mx-0.5 align-baseline"

            range.insertNode(badge)
            range.setStartAfter(badge)
            range.collapse(true)
            const selection = window.getSelection()
            selection?.removeAllRanges()
            selection?.addRange(range)
          }}
          suppressContentEditableWarning
          className={`border-input bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 rounded-xl border px-3 py-3 text-base transition-colors focus-visible:ring-[3px] md:text-sm min-h-16 w-full outline-none whitespace-pre-wrap break-words ${
            isDragOver ? "border-primary ring-2 ring-primary/30" : ""
          } ${isLoading ? "cursor-not-allowed opacity-50" : ""}`}
        ></div>

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

function serializeEditor(element: HTMLElement): string {
  let result = ""
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? ""
    } else if (node instanceof HTMLElement) {
      if (node.dataset.column) {
        result += `{${node.dataset.column}}`
      } else if (node.tagName === "BR") {
        result += "\n"
      } else {
        if (result.length > 0 && !result.endsWith("\n")) {
          result += "\n"
        }
        result += serializeEditor(node)
      }
    }
  }
  return result
}
