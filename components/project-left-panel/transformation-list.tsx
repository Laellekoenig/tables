"use client"

import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react"
import {
  type ClientTransformation,
  useTransformations,
} from "@/components/providers/transformations-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function TransformationList() {
  const {
    transformations,
    isLoading,
    isDeletingTransformations,
    error,
    clearTransformations,
  } = useTransformations()
  const hasTransformations = transformations.length > 0

  return (
    <section className="-mx-6 flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/65 px-6 pb-4 pt-4 backdrop-blur-md">
          <TransformationListHeader
            count={transformations.length}
            isDeletingTransformations={isDeletingTransformations}
            onClearTransformations={() => {
              void clearTransformations()
            }}
          />
        </div>

        {error ?
          <div className="px-6">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          </div>
        : null}

        {isLoading && !hasTransformations ?
          <div className="px-6">
            <TransformationInfoState
              icon={
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              }
              title="Loading transformations..."
            />
          </div>
        : !hasTransformations ?
          <div className="px-6">
            <TransformationInfoState
              icon={
                <div className="rounded-full border border-border/70 bg-background/90 p-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </div>
              }
              title="No transformations yet"
              description="Submit a prompt to create the first transformation card."
            />
          </div>
        : <TransformationCards transformations={transformations} />}
      </div>
    </section>
  )
}

function TransformationListHeader({
  count,
  isDeletingTransformations,
  onClearTransformations,
}: {
  count: number
  isDeletingTransformations: boolean
  onClearTransformations: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Transformations
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="cursor-pointer text-muted-foreground hover:text-destructive"
          aria-label="Delete all transformations"
          title="Delete all transformations"
          disabled={count === 0 || isDeletingTransformations}
          onClick={onClearTransformations}
        >
          {isDeletingTransformations ?
            <Loader2 className="animate-spin" />
          : <Trash2 />}
        </Button>

        <Badge
          variant="outline"
          className="min-w-8 justify-center border-border/60 bg-background/55 font-mono backdrop-blur-sm"
        >
          {count}
        </Badge>
      </div>
    </div>
  )
}

function TransformationInfoState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5">
      <div className="flex items-center gap-3">
        {icon}

        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>

          {description ?
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          : null}
        </div>
      </div>
    </div>
  )
}

function TransformationCards({
  transformations,
}: {
  transformations: ClientTransformation[]
}) {
  return (
    <div className="space-y-4 px-6 pb-4">
      {transformations.map(transformationItem => {
        return (
          <TransformationCard
            key={transformationItem.id}
            transformation={transformationItem}
          />
        )
      })}
    </div>
  )
}

function TransformationCard({
  transformation,
}: {
  transformation: ClientTransformation
}) {
  const hasCode = Boolean(transformation.code?.trim())

  return (
    <Card className="border border-border bg-background ring-0 shadow-none">
      <CardHeader>
        <TransformationCardHeader transformation={transformation} />
      </CardHeader>

      {transformation.errorMessage || hasCode ?
        <CardContent className="space-y-4">
          {hasCode ?
            <TransformationCodeBlock code={transformation.code ?? ""} />
          : null}

          {transformation.errorMessage ?
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {transformation.errorMessage}
            </div>
          : null}
        </CardContent>
      : null}
    </Card>
  )
}

function TransformationCardHeader({
  transformation,
}: {
  transformation: ClientTransformation
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-full border border-border/70 bg-background/90 p-2">
        {renderTransformationStatusIcon(transformation)}
      </div>

      <div className="min-w-0 flex-1">
        <CardTitle className="text-sm leading-6">
          {transformation.prompt}
        </CardTitle>

        <CardDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span>{formatTransformationTimestamp(transformation.createdAt)}</span>

          <span className="text-border">/</span>

          <span className="font-mono">
            {getTransformationLabel(transformation)}
          </span>
        </CardDescription>
      </div>

      <div>
        <Badge
          variant={getTransformationBadgeVariant(transformation)}
          className="capitalize"
        >
          {getTransformationStateLabel(transformation)}
        </Badge>
      </div>
    </div>
  )
}

function TransformationCodeBlock({ code }: { code: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Generated code
      </p>

      <pre className="overflow-x-auto rounded-xl border border-border/70 bg-muted/30 px-4 py-3 font-mono text-xs leading-6 text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function renderTransformationStatusIcon(
  transformationItem: ClientTransformation,
) {
  if (transformationItem.state === "error") {
    return <CircleDashed className="h-4 w-4 text-destructive" />
  }

  if (transformationItem.state === "complete") {
    return <CheckCircle2 className="h-4 w-4 text-primary" />
  }

  return <Loader2 className="h-4 w-4 animate-spin text-primary" />
}

function getTransformationBadgeVariant(
  transformationItem: ClientTransformation,
): "default" | "secondary" | "destructive" | "outline" {
  if (transformationItem.state === "error") {
    return "destructive"
  }

  if (transformationItem.state === "complete") {
    return "default"
  }

  return "secondary"
}

function getTransformationStateLabel(
  transformationItem: ClientTransformation,
): string {
  if (transformationItem.state === "error") {
    return "failed"
  }

  return transformationItem.status
}

function getTransformationLabel(
  transformationItem: ClientTransformation,
): string {
  if (transformationItem.optimisticId) {
    return "pending-id"
  }

  return shortenTransformationId(transformationItem.id)
}

function formatTransformationTimestamp(createdAt: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  }).format(createdAt)
}

function shortenTransformationId(id: string): string {
  return `${id.slice(0, 8)}...`
}
