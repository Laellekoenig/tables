"use client"

import { forwardRef, useImperativeHandle, useRef, useState } from "react"

export interface PromptEditorHandle {
  clear(): void
  serialize(): string
}

interface PromptEditorProps {
  disabled: boolean
  onRequestSubmit: () => void
}

export const PromptEditor = forwardRef<PromptEditorHandle, PromptEditorProps>(
  function PromptEditor({ disabled, onRequestSubmit }, ref) {
    const [isDragOver, setIsDragOver] = useState(false)
    const editorRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
      clear() {
        if (editorRef.current) {
          editorRef.current.innerHTML = ""
        }
      },
      serialize() {
        if (!editorRef.current) {
          return ""
        }
        return serializeEditor(editorRef.current)
      },
    }))

    return (
      <div
        ref={editorRef}
        contentEditable={!disabled}
        data-placeholder="Explain transformation..."
        suppressContentEditableWarning
        className={`border-input bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 rounded-xl border px-3 py-3 text-base transition-colors focus-visible:ring-[3px] md:text-sm min-h-16 w-full outline-none whitespace-pre-wrap break-words ${
          isDragOver ? "border-primary ring-2 ring-primary/30" : ""
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            onRequestSubmit()
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

          const range = getDropRange(editorRef.current, e.clientX, e.clientY)
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
      />
    )
  },
)

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

function getDropRange(
  editorElement: HTMLDivElement | null,
  clientX: number,
  clientY: number,
): Range | null {
  if (!editorElement) {
    return null
  }

  const documentWithCaretPosition = document as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => {
      offsetNode: Node
      offset: number
    } | null
  }

  if (documentWithCaretPosition.caretPositionFromPoint) {
    const caretPosition = documentWithCaretPosition.caretPositionFromPoint(
      clientX,
      clientY,
    )
    if (caretPosition && editorElement.contains(caretPosition.offsetNode)) {
      const pointRange = document.createRange()
      pointRange.setStart(caretPosition.offsetNode, caretPosition.offset)
      pointRange.collapse(true)
      return pointRange
    }
  }

  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const selectionRange = selection.getRangeAt(0)
    if (editorElement.contains(selectionRange.commonAncestorContainer)) {
      return selectionRange.cloneRange()
    }
  }

  const endRange = document.createRange()
  endRange.selectNodeContents(editorElement)
  endRange.collapse(false)
  return endRange
}
