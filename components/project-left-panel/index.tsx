"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { useProject } from "@/src/hooks/use-project"

export function ProjectLeftPanel() {
  const { project } = useProject()

  return (
    <div>
      <div className="w-full border-b p-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">{project.name}</h1>

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
    </div>
  )
}
