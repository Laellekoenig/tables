"use client"

import { useState } from "react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { safeFetch } from "@/src/lib/safe-fetch"
import { useProject } from "@/src/hooks/use-project"

export function ProjectRightPanel() {
  const { project } = useProject()
  const [prompt, setPrompt] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!prompt.trim()) {
      return
    }

    const result = await safeFetch("/api/transform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, projectId: project.id }),
    })

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
          value={prompt}
          onChange={e => {
            setPrompt(e.target.value)
          }}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
          placeholder="Explain transformation..."
        />

        <Button
          type="submit"
          className="cursor-pointer self-end"
        >
          Submit
        </Button>
      </form>
    </div>
  )
}
