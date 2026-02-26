"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useProjects } from "@/src/hooks/use-projects"

export default function ProjectSelector() {
  const { projects, isLoading, error, createProject, isCreating } =
    useProjects()

  return (
    <div className="w-full h-full max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">Projects</h1>
      <Button
        className="mt-4 cursor-pointer"
        onClick={createProject}
        disabled={isCreating}
      >
        <Plus />
        {isCreating ? "Creating..." : "Create New Project"}
      </Button>
      {error && <p className="mt-4 text-destructive">{error}</p>}
      {isLoading ?
        <p className="mt-4 text-muted-foreground">Loading projects...</p>
      : projects.length === 0 ?
        <p className="mt-4 text-muted-foreground">No projects yet</p>
      : <ul className="mt-4 space-y-2">
          {projects.map(p => (
            <li
              key={p.id}
              className="rounded-md border px-4 py-3"
            >
              {p.name}
            </li>
          ))}
        </ul>
      }
    </div>
  )
}
