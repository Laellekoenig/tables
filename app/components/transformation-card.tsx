"use client"

import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { serverDeleteTransformation } from "@/src/server/delete-transformation"
import { type Transformation } from "@/src/server/transformation-helpers"

const statusVariantMap = {
  completed: "default",
  running: "default",
  pending: "secondary",
  error: "destructive",
  stale: "outline",
} as const

export function TransformationCard({
  transformation,
}: {
  transformation: Transformation
}) {
  const router = useRouter()
  const variant = statusVariantMap[transformation.status]

  return (
    <Card
      size="sm"
      className="border border-border ring-0"
    >
      <CardHeader>
        <CardTitle className="text-sm line-clamp-1">
          {transformation.prompt}
        </CardTitle>

        <CardAction className="flex items-center gap-1">
          <Badge variant={variant}>
            {transformation.status === "running" && (
              <Loader2 className="animate-spin" />
            )}
            {transformation.status}
          </Badge>

          <Button
            variant="ghost"
            size="icon-xs"
            className="cursor-pointer"
            onClick={() => handleDelete(transformation.id, router)}
          >
            <Trash2 />
          </Button>
        </CardAction>
      </CardHeader>

      {transformation.codeSnippet && (
        <CardContent>
          <pre className="overflow-x-auto overflow-y-auto max-h-48 rounded-xl bg-muted p-3 text-xs font-mono">
            {transformation.codeSnippet}
          </pre>
        </CardContent>
      )}

      {transformation.status === "error" && transformation.errorMessage && (
        <CardContent>
          <p className="text-destructive text-xs">
            {transformation.errorMessage}
          </p>
        </CardContent>
      )}
    </Card>
  )
}

async function handleDelete(id: string, router: ReturnType<typeof useRouter>) {
  const result = await serverDeleteTransformation(id)
  if (!result.ok) {
    toast.error(result.error)
    return
  }
  router.refresh()
}
