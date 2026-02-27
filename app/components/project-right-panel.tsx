"use client"

import { useRef, useState } from "react"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useProject } from "@/src/hooks/use-project"
import {
  type TransformationTree,
  type Transformation,
} from "@/src/server/transformation-helpers"
import { serverCreateAndExecuteTransformation } from "@/src/server/create-and-execute-transformation"
import { type PromptEditorHandle, PromptEditor } from "./prompt-editor"
import { TransformationCard } from "./transformation-card"

export function ProjectRightPanel() {
  const { project, transformationTree } = useProject()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const editorRef = useRef<PromptEditorHandle>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!editorRef.current) {
      return
    }

    const prompt = editorRef.current.serialize().trim()
    if (!prompt) {
      return
    }

    setIsLoading(true)

    const result = await serverCreateAndExecuteTransformation({
      projectId: project.id,
      parentId: null,
      prompt,
    })

    setIsLoading(false)

    if (result.ok) {
      editorRef.current.clear()
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const transformations = flattenTree(transformationTree)

  return (
    <div className="flex flex-col p-4">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex flex-col gap-2"
      >
        <PromptEditor
          ref={editorRef}
          disabled={isLoading}
          onRequestSubmit={() => {
            formRef.current?.requestSubmit()
          }}
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

      {transformations.length > 0 && (
        <div className="flex flex-col gap-3 mt-4 overflow-y-auto">
          {transformations.map(t => (
            <TransformationCard
              key={t.id}
              transformation={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function flattenTree(tree: TransformationTree[]): Transformation[] {
  const result: Transformation[] = []

  for (const item of tree) {
    result.push(item.node)
    result.push(...flattenTree(item.children))
  }

  return result
}
