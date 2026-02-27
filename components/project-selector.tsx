"use client"

import { useRef, useState } from "react"
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
import Link from "next/link"
import { useProjects } from "@/src/hooks/use-projects"
import { MAX_CSV_SIZE } from "@/src/lib/csv-validation"

export default function ProjectSelector() {
  const { projects, isLoading, error, createProject, isCreating } =
    useProjects()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetDialog() {
    setProjectName("")
    setCsvFile(null)
    setFileError("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError("")
    const file = e.target.files?.[0] ?? null

    if (file && file.size > MAX_CSV_SIZE) {
      setFileError("File must be under 1 MB.")
      setCsvFile(null)
      return
    }

    setCsvFile(file)
  }

  function handleCreate() {
    const trimmed = projectName.trim()
    if (!trimmed || !csvFile) {
      return
    }

    createProject({ name: trimmed, file: csvFile })
    setDialogOpen(false)
    resetDialog()
  }

  return (
    <div className="w-full h-full max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">Projects</h1>

      <Dialog
        open={dialogOpen}
        onOpenChange={open => {
          setDialogOpen(open)
          if (!open) {
            resetDialog()
          }
        }}
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
              Enter a name and upload a CSV file for your new project.
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

          <div className="flex flex-col gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="cursor-pointer"
              onChange={handleFileChange}
            />

            {csvFile && (
              <p className="text-sm text-muted-foreground">
                {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
              </p>
            )}

            {fileError && (
              <p className="text-sm text-destructive">{fileError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => {
                setDialogOpen(false)
                resetDialog()
              }}
            >
              Cancel
            </Button>

            <Button
              className="cursor-pointer"
              onClick={handleCreate}
              disabled={!projectName.trim() || !csvFile || isCreating}
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
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="block rounded-md border px-4 py-3 cursor-pointer hover:bg-accent"
              >
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      }
    </div>
  )
}
