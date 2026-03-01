"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { TransformationsProvider } from "@/components/providers/transformations-provider"
import { buttonVariants } from "@/components/ui/button"
import { TransformForm } from "@/components/project-left-panel/transform-form"
import { TransformationList } from "@/components/project-left-panel/transformation-list"
import { useProject } from "@/src/hooks/use-project"

export function ProjectLeftPanel() {
  const { project } = useProject()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      <div className="w-full border-b border-border/70 px-6 pb-6 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Project
            </p>

            <h1 className="mt-3 text-2xl font-bold tracking-tight">
              {project.name}
            </h1>
          </div>

          <Link
            href="/"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className:
                "w-fit shrink-0 cursor-pointer text-muted-foreground hover:text-foreground/80",
            })}
          >
            <ArrowLeft />
            Back
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex flex-1 flex-col px-6">
        <TransformationsProvider>
          <TransformForm />

          <TransformationList />
        </TransformationsProvider>
      </div>
    </div>
  )
}
