"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { TransformForm } from "@/components/project-left-panel/transform-form"
import { useProject } from "@/src/hooks/use-project"

export function ProjectLeftPanel() {
  const { project } = useProject()

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-background via-background to-muted/20">
      <div className="w-full border-b border-border/70 p-6">
        <div className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Project
          </p>

          <h1 className="mt-3 text-2xl font-bold tracking-tight">
            {project.name}
          </h1>

          <Link
            href="/"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className:
                "mt-3 w-fit cursor-pointer text-muted-foreground hover:text-foreground/80",
            })}
          >
            <ArrowLeft />
            Back to project selector
          </Link>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6">
        <TransformForm />
      </div>
    </div>
  )
}
