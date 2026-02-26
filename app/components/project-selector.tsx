"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { useProjects } from "@/src/hooks/use-projects"

export default function ProjectSelector() {
  const { projects, isLoading, error, createProject, isCreating } =
    useProjects()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [projectName, setProjectName] = useState("")

  function handleCreate() {
    const trimmed = projectName.trim()
    if (!trimmed) {
      return
    }
    createProject(trimmed)
    setDialogOpen(false)
    setProjectName("")
  }

  return (
    <div className="w-full h-full max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">Projects</h1>
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      >
        <Button
          className="mt-4 cursor-pointer"
          onClick={() => {
            setDialogOpen(true)
          }}
          disabled={isCreating}
        >
          <Plus />
          {isCreating ? "Creating..." : "Create New Project"}
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter a name for your new project.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Project name"
            value={projectName}
            onChange={e => {
              setProjectName(e.target.value)
            }}
            onKeyDown={e => {
              if (e.key === "Enter") {
                handleCreate()
              }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => {
                setDialogOpen(false)
                setProjectName("")
              }}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              onClick={handleCreate}
              disabled={!projectName.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
