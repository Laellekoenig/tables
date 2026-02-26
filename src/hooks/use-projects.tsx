"use client"

import { createContext, useContext } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  serverGetProjects,
  serverNewProject,
  type Project,
} from "@/src/server/project-actions"

const PROJECTS_KEY = ["projects"]

interface ProjectsContextValue {
  projects: Project[]
  isLoading: boolean
  error: string | null
  createProject: (name: string) => void
  isCreating: boolean
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null)

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: async () => {
      const result = await serverGetProjects()
      if (!result.ok) {
        throw new Error(result.error)
      }
      return result.value
    },
  })

  const mutation = useMutation({
    mutationFn: async (name: string) => {
      const result = await serverNewProject(name)
      if (!result.ok) {
        throw new Error(result.error)
      }
      return result.value
    },
    onMutate: async (name: string) => {
      await queryClient.cancelQueries({ queryKey: PROJECTS_KEY })

      const previous = queryClient.getQueryData<Project[]>(PROJECTS_KEY)

      const placeholder: Project = {
        id: crypto.randomUUID(),
        name,
        userId: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      queryClient.setQueryData<Project[]>(PROJECTS_KEY, old => [
        placeholder,
        ...(old ?? []),
      ])

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(PROJECTS_KEY, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY })
    },
  })

  const value: ProjectsContextValue = {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? query.error.message : null,
    createProject: (name: string) => {
      mutation.mutate(name)
    },
    isCreating: mutation.isPending,
  }

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  )
}

export function useProjects(): ProjectsContextValue {
  const context = useContext(ProjectsContext)
  if (!context) {
    throw new Error("useProjects must be used within a ProjectsProvider")
  }
  return context
}
