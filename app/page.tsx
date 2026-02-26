"use client"

import { useEffect, useState } from "react"
import { authClient } from "@/src/client/auth-client"
import ProjectSelector from "@/app/components/project-selector"
import { ProjectsProvider } from "@/src/hooks/use-projects"

export default function Home() {
  const { data: session } = authClient.useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="h-[var(--content-height)] p-8">
      {session ?
        <ProjectsProvider>
          <ProjectSelector />
        </ProjectsProvider>
      : <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Not logged in.</p>
        </div>
      }
    </div>
  )
}
